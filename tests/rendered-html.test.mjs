import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Whisper chat experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Whisper — Private conversations<\/title>/i);
  assert.match(html, /Product Crew/);
  assert.match(html, /Messages are end-to-end encrypted/);
  assert.match(html, /Write a message/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("keeps plaintext out of the persistence boundary", async () => {
  const [route, conversationsRoute, cryptoClient, schema, hosting] = await Promise.all([
    readFile(new URL("../app/api/messages/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/conversations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/client-crypto.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(cryptoClient, /AES-GCM/);
  assert.match(cryptoClient, /indexedDB/);
  assert.match(route, /ciphertext/);
  assert.match(route, /conversation_members/);
  assert.doesNotMatch(route, /payload\.text|plaintext/);
  assert.match(route, /not a member of this conversation/);
  assert.doesNotMatch(route, /INSERT OR IGNORE INTO conversation_members/);
  assert.match(conversationsRoute, /WHERE cm\.user_id = \?/);
  assert.match(conversationsRoute, /cache-control/);
  assert.match(schema, /idx_messages_conversation_created_at/);
  assert.match(hosting, /"d1": "DB"/);
});

test("encrypts reaction events before persistence", async () => {
  const [client, route] = await Promise.all([
    readFile(new URL("../app/chat-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/messages/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(client, /`\[reaction\].*targetId/);
  assert.match(client, /persistEncryptedControl/);
  assert.doesNotMatch(route, /reaction|emoji/);
});

test("keeps drafts device-local and provides in-chat search", async () => {
  const [client, route] = await Promise.all([
    readFile(new URL("../app/chat-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/messages/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(client, /whisper-draft:/);
  assert.match(client, /chatSearchResults/);
  assert.match(client, /Search messages in/);
  assert.doesNotMatch(route, /draft/);
});

test("stores reply context inside encrypted message content", async () => {
  const [client, route] = await Promise.all([
    readFile(new URL("../app/chat-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/messages/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(client, /\[message\].*replyTo/);
  assert.match(client, /encryptMessage\(secureChat\.id, storedContent\)/);
  assert.doesNotMatch(route, /replyTo/);
});

test("syncs edits and deletions as encrypted control events", async () => {
  const [client, route] = await Promise.all([
    readFile(new URL("../app/chat-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/messages/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(client, /`\[edit\].*targetId/);
  assert.match(client, /`\[delete\].*targetId/);
  assert.match(client, /persistEncryptedControl/);
  assert.doesNotMatch(route, /\bedit\b|\bdelete\b|targetId/);
});

test("adds baseline browser security headers", async () => {
  const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(worker, /x-content-type-options/);
  assert.match(worker, /strict-transport-security/);
  assert.match(worker, /permissions-policy/);
});

test("keeps online GIF provider credentials on the server", async () => {
  const [route, client] = await Promise.all([
    readFile(new URL("../app/api/gifs/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/chat-app.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(route, /TENOR_API_KEY/);
  assert.match(route, /contentfilter/);
  assert.match(route, /tenor\.googleapis\.com/);
  assert.match(client, /\/api\/gifs/);
  assert.doesNotMatch(client, /TENOR_API_KEY|tenor\.googleapis\.com/);
});
