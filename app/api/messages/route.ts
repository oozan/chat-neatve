import { env } from "cloudflare:workers";

type D1Result<T> = { results?: T[] };

type StoredMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  ciphertext: string;
  iv: string;
  created_at: string;
};

function database() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

async function initializeDatabase() {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      public_key TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'direct',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      wrapped_key TEXT,
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (conversation_id, user_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id),
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      algorithm TEXT NOT NULL DEFAULT 'AES-GCM-256',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages(conversation_id, created_at)"),
  ]);
}

function identity(request: Request) {
  const userId = request.headers.get("oai-authenticated-user-id") ?? request.headers.get("x-whisper-device-id");
  const email = request.headers.get("oai-authenticated-user-email");
  return { userId, email };
}

function isValidEncryptedField(value: unknown, maximum: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && /^[A-Za-z0-9+/=]+$/.test(value);
}

export async function GET(request: Request) {
  const { userId } = identity(request);
  if (!userId) return Response.json({ error: "Authentication is required" }, { status: 401 });

  const conversationId = new URL(request.url).searchParams.get("conversationId")?.trim();
  if (!conversationId) return Response.json({ error: "conversationId is required" }, { status: 400 });

  await initializeDatabase();
  const db = database();
  const membership = await db.prepare(
    "SELECT 1 AS allowed FROM conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1",
  ).bind(conversationId, userId).first();

  if (!membership) return Response.json({ messages: [] });

  const result = await db.prepare(
    `SELECT id, conversation_id, sender_id, ciphertext, iv, created_at
     FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC LIMIT 250`,
  ).bind(conversationId).all() as D1Result<StoredMessage>;

  return Response.json({
    messages: (result.results ?? []).map((message) => ({
      id: message.id,
      ciphertext: message.ciphertext,
      iv: message.iv,
      createdAt: message.created_at,
      mine: message.sender_id === userId,
    })),
  });
}

export async function POST(request: Request) {
  const { userId, email } = identity(request);
  if (!userId) return Response.json({ error: "Authentication is required" }, { status: 401 });

  const payload = await request.json() as {
    conversationId?: string;
    conversationTitle?: string;
    ciphertext?: string;
    iv?: string;
  };
  const conversationId = payload.conversationId?.trim();
  const conversationTitle = payload.conversationTitle?.trim();

  if (!conversationId || !/^[a-z0-9-]{1,80}$/i.test(conversationId)) {
    return Response.json({ error: "A valid conversationId is required" }, { status: 400 });
  }
  if (!conversationTitle || conversationTitle.length > 120) {
    return Response.json({ error: "A valid conversationTitle is required" }, { status: 400 });
  }
  if (!isValidEncryptedField(payload.ciphertext, 64_000) || !isValidEncryptedField(payload.iv, 64)) {
    return Response.json({ error: "A valid encrypted message payload is required" }, { status: 400 });
  }

  await initializeDatabase();
  const db = database();
  const id = crypto.randomUUID();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)").bind(userId, email),
    db.prepare("INSERT OR IGNORE INTO conversations (id, title) VALUES (?, ?)").bind(conversationId, conversationTitle),
    db.prepare("INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)").bind(conversationId, userId),
    db.prepare(
      "INSERT INTO messages (id, conversation_id, sender_id, ciphertext, iv) VALUES (?, ?, ?, ?, ?)",
    ).bind(id, conversationId, userId, payload.ciphertext, payload.iv),
  ]);

  return Response.json({ message: { id, createdAt: new Date().toISOString() } }, { status: 201 });
}
