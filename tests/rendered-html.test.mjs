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
  const [route, cryptoClient, schema, hosting] = await Promise.all([
    readFile(new URL("../app/api/messages/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/client-crypto.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(cryptoClient, /AES-GCM/);
  assert.match(cryptoClient, /indexedDB/);
  assert.match(route, /ciphertext/);
  assert.match(route, /conversation_members/);
  assert.doesNotMatch(route, /payload\.text|plaintext/);
  assert.match(schema, /idx_messages_conversation_created_at/);
  assert.match(hosting, /"d1": "DB"/);
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
