# Whisper

Whisper is a responsive Telegram-inspired chat application with client-side message encryption and durable ciphertext storage.

## What works

- Responsive desktop and mobile conversation UI
- Conversation search, filtering, unread states, details, and message composer
- Optimistic sending with delivered, read, and failed states
- AES-256-GCM encryption in the browser before network transmission
- Non-exportable conversation keys stored in IndexedDB on the device
- Cloudflare D1 persistence containing ciphertext and IVs, never message plaintext
- Server-side conversation membership checks
- ChatGPT/Sites identity headers in production with a local development device identity fallback
- Generated and versioned database migrations

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

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
- `app/api/messages/route.ts` — ciphertext-only message API
- `db/schema.ts` — relational data model
- `drizzle/` — generated D1 migration
- `.openai/hosting.json` — deployment bindings
