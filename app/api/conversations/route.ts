import { env } from "cloudflare:workers";

type D1Result<T> = { results?: T[] };

type StoredConversation = {
  id: string;
  title: string;
  kind: "direct" | "group" | "saved";
  created_at: string;
  last_activity: string;
  message_count: number;
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
  return {
    userId: request.headers.get("oai-authenticated-user-id") ?? request.headers.get("x-whisper-device-id"),
    email: request.headers.get("oai-authenticated-user-email"),
  };
}

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", "no-store");
  return Response.json(data, { ...init, headers });
}

export async function GET(request: Request) {
  const { userId } = identity(request);
  if (!userId) return json({ error: "Authentication is required" }, { status: 401 });

  await initializeDatabase();
  const result = await database().prepare(
    `SELECT c.id, c.title, c.kind, c.created_at,
            COALESCE(MAX(m.created_at), c.created_at) AS last_activity,
            COUNT(m.id) AS message_count
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     LEFT JOIN messages m ON m.conversation_id = c.id
     WHERE cm.user_id = ?
     GROUP BY c.id, c.title, c.kind, c.created_at
     ORDER BY last_activity DESC, c.id ASC
     LIMIT 100`,
  ).bind(userId).all() as D1Result<StoredConversation>;

  return json({
    conversations: (result.results ?? []).map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      kind: conversation.kind,
      createdAt: conversation.created_at,
      lastActivity: conversation.last_activity,
      messageCount: Number(conversation.message_count),
    })),
  });
}

export async function POST(request: Request) {
  const { userId, email } = identity(request);
  if (!userId) return json({ error: "Authentication is required" }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_000) return json({ error: "Request body is too large" }, { status: 413 });

  let payload: { title?: unknown; kind?: unknown };
  try {
    payload = await request.json() as { title?: unknown; kind?: unknown };
  } catch {
    return json({ error: "A JSON request body is required" }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim().replace(/\s+/g, " ") : "";
  const kind = payload.kind === "group" || payload.kind === "saved" ? payload.kind : "direct";
  if (title.length < 1 || title.length > 80) {
    return json({ error: "Conversation title must be between 1 and 80 characters" }, { status: 400 });
  }

  await initializeDatabase();
  const db = database();
  const id = `chat-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)").bind(userId, email),
    db.prepare("INSERT INTO conversations (id, title, kind, created_at) VALUES (?, ?, ?, ?)").bind(id, title, kind, createdAt),
    db.prepare("INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)").bind(id, userId),
  ]);

  return json({ conversation: { id, title, kind, createdAt, lastActivity: createdAt, messageCount: 0 } }, { status: 201 });
}
