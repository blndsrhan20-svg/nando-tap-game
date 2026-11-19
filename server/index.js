import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Server as SocketServer } from "socket.io";
import { pool } from "./db.js";

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || "";
if (jwtSecret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");

const allowedOrigins = (process.env.APP_ORIGIN || "http://localhost:4173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
  credentials: false
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));

const io = new SocketServer(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

const registerSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/),
  displayName: z.string().trim().min(1).max(64),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  password: z.string().min(8).max(72)
});
const loginSchema = z.object({
  identity: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(72)
});
const messageSchema = z.object({ body: z.string().trim().min(1).max(4000) });

function publicUser(row) {
  return { id: row.id, username: row.username, displayName: row.display_name, email: row.email, avatarUrl: row.avatar_url };
}
function issueToken(user) {
  return jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: "12h", issuer: "thunder-api", audience: "thunder-client" });
}
async function authenticateToken(token) {
  const decoded = jwt.verify(token, jwtSecret, { issuer: "thunder-api", audience: "thunder-client" });
  const result = await pool.query(
    "SELECT id, username, display_name, email, avatar_url FROM users WHERE id = $1",
    [decoded.sub]
  );
  if (!result.rowCount) throw new Error("User not found");
  return publicUser(result.rows[0]);
}
async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Authentication required" });
    req.user = await authenticateToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
async function isMember(conversationId, userId) {
  const result = await pool.query(
    "SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2",
    [conversationId, userId]
  );
  return result.rowCount > 0;
}

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "thunder-api", database: "connected" });
  } catch {
    res.status(503).json({ ok: false, service: "thunder-api", database: "unavailable" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid registration details" });
  const { username, displayName, email, password } = parsed.data;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (username, display_name, email, password_hash) VALUES ($1,$2,$3,$4) RETURNING id, username, display_name, email, avatar_url",
      [username, displayName, email || null, passwordHash]
    );
    const user = publicUser(result.rows[0]);
    return res.status(201).json({ token: issueToken(user), user });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Username or email is already in use" });
    console.error("Registration error:", error.message);
    return res.status(500).json({ error: "Could not create account" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid username/email and password" });
  try {
    const result = await pool.query(
      "SELECT id, username, display_name, email, avatar_url, password_hash FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) LIMIT 1",
      [parsed.data.identity]
    );
    const row = result.rows[0];
    if (!row || !(await bcrypt.compare(parsed.data.password, row.password_hash))) {
      return res.status(401).json({ error: "Incorrect login details" });
    }
    const user = publicUser(row);
    return res.json({ token: issueToken(user), user });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Could not sign in" });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: req.user }));

app.get("/api/users/search", requireAuth, async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  if (q.length < 2 || q.length > 32) return res.json({ users: [] });
  const result = await pool.query(
    "SELECT id, username, display_name, avatar_url FROM users WHERE username ILIKE $1 AND id <> $2 ORDER BY username LIMIT 20",
    [`%${q}%`, req.user.id]
  );
  res.json({ users: result.rows.map((row) => ({ id: row.id, username: row.username, displayName: row.display_name, avatarUrl: row.avatar_url })) });
});

app.get("/api/conversations", requireAuth, async (req, res) => {
  const result = await pool.query(`
    SELECT c.id, c.type, c.title, c.created_at,
      (SELECT json_build_object('id', m.id, 'body', m.body, 'created_at', m.created_at, 'sender_id', m.sender_id)
       FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
       ORDER BY m.created_at DESC LIMIT 1) AS last_message,
      (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'displayName', u.display_name, 'avatarUrl', u.avatar_url))
       FROM conversation_members cm JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = c.id) AS members,
      (SELECT COUNT(*)::int FROM messages unread
       WHERE unread.conversation_id = c.id
         AND unread.sender_id <> $1
         AND unread.deleted_at IS NULL
         AND unread.created_at > COALESCE(mine.last_read_at, 'epoch'::timestamptz)) AS unread_count
    FROM conversations c
    JOIN conversation_members mine ON mine.conversation_id = c.id AND mine.user_id = $1
    ORDER BY COALESCE((SELECT MAX(m2.created_at) FROM messages m2 WHERE m2.conversation_id = c.id), c.created_at) DESC
  `, [req.user.id]);
  res.json({ conversations: result.rows });
});

app.post("/api/conversations/:id/read", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE conversation_members SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2 RETURNING last_read_at",
      [req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Conversation not found" });
    io.to(`conversation:${req.params.id}`).emit("conversation:read", {
      conversationId: req.params.id, userId: req.user.id, lastReadAt: result.rows[0].last_read_at
    });
    return res.json({ ok: true, lastReadAt: result.rows[0].last_read_at });
  } catch (error) {
    console.error("Read receipt error:", error.message);
    return res.status(500).json({ error: "Could not update read status" });
  }
});

app.post("/api/conversations", requireAuth, async (req, res) => {
  const schema = z.object({
    type: z.enum(["direct", "group"]),
    memberUserIds: z.array(z.string().uuid()).min(1).max(100),
    title: z.string().trim().max(100).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid conversation details" });
  const memberIds = [...new Set([...parsed.data.memberUserIds, req.user.id])];
  if (parsed.data.type === "direct" && memberIds.length !== 2) return res.status(400).json({ error: "A direct chat needs exactly two users" });
  if (parsed.data.type === "group" && !parsed.data.title) return res.status(400).json({ error: "Group title is required" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const users = await client.query("SELECT id FROM users WHERE id = ANY($1::uuid[])", [memberIds]);
    if (users.rowCount !== memberIds.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "One or more users were not found" });
    }
    const pairKey = parsed.data.type === "direct" ? [...memberIds].sort().join(":") : null;
    let conversation;
    if (pairKey) {
      const inserted = await client.query(
        "INSERT INTO conversations (type, pair_key, created_by) VALUES ('direct',$1,$2) ON CONFLICT (pair_key) DO UPDATE SET pair_key = EXCLUDED.pair_key RETURNING id, type, title, created_at",
        [pairKey, req.user.id]
      );
      conversation = inserted.rows[0];
    } else {
      const inserted = await client.query(
        "INSERT INTO conversations (type, title, created_by) VALUES ('group',$1,$2) RETURNING id, type, title, created_at",
        [parsed.data.title, req.user.id]
      );
      conversation = inserted.rows[0];
    }
    for (const userId of memberIds) {
      await client.query(
        "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [conversation.id, userId, userId === req.user.id ? "owner" : "member"]
      );
    }
    await client.query("COMMIT");
    return res.status(201).json({ conversation });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Conversation create error:", error.message);
    return res.status(500).json({ error: "Could not create conversation" });
  } finally {
    client.release();
  }
});

app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
  if (!(await isMember(req.params.id, req.user.id))) return res.status(404).json({ error: "Conversation not found" });
  const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 100);
  const result = await pool.query(
    "SELECT id, conversation_id, sender_id, body, created_at FROM messages WHERE conversation_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2",
    [req.params.id, limit]
  );
  res.json({ messages: result.rows.reverse() });
});

async function saveMessage(conversationId, user, body) {
  if (!(await isMember(conversationId, user.id))) throw new Error("NOT_MEMBER");
  const result = await pool.query(
    "INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1,$2,$3) RETURNING id, conversation_id, sender_id, body, created_at",
    [conversationId, user.id, body]
  );
  return result.rows[0];
}

app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Message must contain 1–4000 characters" });
  try {
    const message = await saveMessage(req.params.id, req.user, parsed.data.body);
    io.to(`conversation:${req.params.id}`).emit("message:new", message);
    res.status(201).json({ message });
  } catch (error) {
    if (error.message === "NOT_MEMBER") return res.status(404).json({ error: "Conversation not found" });
    console.error("Message send error:", error.message);
    res.status(500).json({ error: "Could not send message" });
  }
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    socket.user = await authenticateToken(token);
    next();
  } catch {
    next(new Error("Invalid session"));
  }
});
io.on("connection", (socket) => {
  socket.on("conversation:join", async (conversationId) => {
    if (typeof conversationId !== "string" || !(await isMember(conversationId, socket.user.id))) return;
    socket.join(`conversation:${conversationId}`);
  });
  socket.on("typing:update", async (payload) => {
    try {
      const parsed = z.object({ conversationId: z.string().uuid(), active: z.boolean() }).safeParse(payload);
      if (!parsed.success || !(await isMember(parsed.data.conversationId, socket.user.id))) return;
      socket.to(`conversation:${parsed.data.conversationId}`).emit("typing:update", {
        conversationId: parsed.data.conversationId,
        userId: socket.user.id,
        displayName: socket.user.displayName,
        active: parsed.data.active
      });
    } catch {}
  });
  socket.on("message:send", async (payload, callback) => {
    try {
      const parsed = z.object({ conversationId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).safeParse(payload);
      if (!parsed.success) return callback?.({ ok: false, error: "Invalid message" });
      const message = await saveMessage(parsed.data.conversationId, socket.user, parsed.data.body);
      io.to(`conversation:${parsed.data.conversationId}`).emit("message:new", message);
      callback?.({ ok: true, message });
    } catch (error) {
      callback?.({ ok: false, error: error.message === "NOT_MEMBER" ? "Conversation not found" : "Could not send message" });
    }
  });
});

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
app.use((req, res, next) => {
  if (/^\/(?:server|docs|\.git|\.env|package\.json|README\.md|\.gitmodules)(?:\/|$)/i.test(req.path)) return res.sendStatus(404);
  next();
});
app.use(express.static(webRoot, { dotfiles: "deny", index: "index.html" }));

app.use((error, _req, res, _next) => {
  if (error.message === "Origin not allowed") return res.status(403).json({ error: "Origin not allowed" });
  console.error("Unhandled API error:", error.message);
  res.status(500).json({ error: "Internal server error" });
});

httpServer.listen(port, () => console.log(`THUNDER API listening on port ${port}`));
