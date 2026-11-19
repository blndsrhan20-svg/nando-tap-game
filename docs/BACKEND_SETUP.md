# NANDO backend setup

The backend is a standalone Node.js API using PostgreSQL. It is intentionally separate from the Telegram source submodules and does not touch any other project database.

## Local setup

1. Install Node.js 20 or newer and PostgreSQL 14 or newer.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, a random `JWT_SECRET` (32+ characters), and the exact frontend origin in `APP_ORIGIN`.
3. Install packages with `npm install`.
4. Apply the schema with `npm run db:migrate`.
5. Start the API with `npm run dev`.
6. Check `GET /health`; it should return `ok: true` and `database: connected`.

## API routes

- `POST /api/auth/register` — username, displayName, optional email, password.
- `POST /api/auth/login` — identity (username or email), password.
- `GET /api/auth/me` — current account.
- `GET /api/users/search?q=username` — find users by username.
- `GET /api/conversations` — conversations for the signed-in user.
- `POST /api/conversations` — create direct or group conversation.
- `GET /api/conversations/:id/messages` — read recent messages.
- `POST /api/conversations/:id/messages` — send a message.
- Socket.IO: authenticated `conversation:join`, `message:send`, and `message:new`.

## Security notes

- Passwords are hashed with bcrypt; passwords are never returned.
- API access uses short-lived (12-hour) signed JWTs.
- Conversation membership is checked before reading or sending messages.
- CORS uses an explicit origin allow-list; auth routes are rate-limited.
- Keep `.env` out of Git. Never place database passwords or JWT secrets in browser code.

## Current scope and limitations

The web UI now includes sign-in and registration screens and switches to the remote API when the backend health endpoint is reachable. The server also serves the web app and the Socket.IO client from the same origin. The local demo remains available if no backend is reachable.

A hosted database and API have **not** been provisioned or deployed yet. No live URL or production credentials are configured. File upload/storage, push notifications, voice/video calls, end-to-end encryption, account recovery, group creation UI, and production load/security testing remain outstanding. Do not describe these as active until implemented and tested.
