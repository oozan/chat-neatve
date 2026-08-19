# Whisper

Whisper is a responsive Telegram-inspired chat application with client-side message encryption and durable ciphertext storage.

## 0.2 milestone

The 0.2 release marks the first complete private-chat MVP: durable conversations, encrypted messages and control events, replies, reactions, editing, deletion markers, message search, draft recovery, and working conversation preferences are implemented and covered by the automated security-boundary checks.

## What works

- Responsive desktop and mobile conversation UI
- Conversation search, filtering, unread states, details, and message composer
- Durable conversation creation and restoration across sessions
- Automatic encrypted message synchronization with offline status and retry controls
- Reactions persisted as encrypted control events rather than server-readable emoji metadata
- Fast in-conversation message search with keyboard support
- Per-conversation drafts kept locally on the device
- Encrypted message replies with restored quote context
- Encrypted message editing and synchronized deletion markers
- Working unread/group/saved/archive filters plus device-persisted pin, mute, and archive preferences
- Optimistic sending with delivered, read, and failed states
- AES-256-GCM encryption in the browser before network transmission
- Non-exportable conversation keys stored in IndexedDB on the device
- Cloudflare D1 persistence containing ciphertext and IVs, never message plaintext
- Server-side conversation membership checks
- Payload size limits, no-store API responses, and baseline browser security headers
- ChatGPT/Sites identity headers in production with a local development device identity fallback
- Generated and versioned database migrations

## Run locally

Requires Node.js 22.13 or newer.

```bash
nvm install 22
nvm use
npm install
npm run dev
```

Open `http://localhost:3000`.

### Online GIF search

Whisper keeps its built-in animated GIF collection available without any external service. To also search Tenor online, copy `.env.example` to `.env.local` and add a Tenor API key as `TENOR_API_KEY`. Configure the same secret in the deployed Sites environment to enable online search there.

## Quality checks

```bash
npm run lint
npm test
```

The test command creates the production build and verifies the rendered product and encryption boundary.

## Security model

Message bodies are encrypted on the sender's device with AES-256-GCM. The API validates and stores only ciphertext, a unique initialization vector, sender identity, and routing metadata. Conversation keys are generated as non-exportable Web Crypto keys and kept in IndexedDB.

This repository is an MVP, not an audited messenger protocol. The current experience supports durable encrypted messages on the device that created the conversation key. Secure key exchange, contact invitation, multi-device key transfer, key rotation, forward secrecy, push notifications, media encryption, abuse controls, and account recovery are intentionally not represented as complete. Those are required before treating it as a production replacement for Telegram or Signal.

## Project shape

- `app/chat-app.tsx` — product interface and chat interactions
- `app/client-crypto.ts` — device-side encryption and key vault
- `app/api/conversations/route.ts` — durable user-owned conversation API
- `app/api/messages/route.ts` — membership-protected ciphertext-only message API
- `db/schema.ts` — relational data model
- `drizzle/` — generated D1 migration
- `.openai/hosting.json` — deployment bindings
