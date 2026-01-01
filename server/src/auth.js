import { readDB, writeDB, uuid } from "./db.js";

export function register(req, res) {
  const { username, password, firstName, avatarUrl } = req.body || {};

  if (!username || !password || !firstName || !avatarUrl) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const db = readDB();
  const exists = db.users.some(u => u.username === username);
  if (exists) return res.status(409).json({ error: "Username already exists." });

  const user = {
    id: uuid(),
    username,
    password, // NOTE: course project; in real apps, hash this
    firstName,
    avatarUrl,
    playlists: [
      { id: uuid(), name: "Favorites", createdAt: Date.now(), items: [] }
    ]
  };

  db.users.push(user);
  writeDB(db);

  // Return safe user (no password)
  return res.json({ ok: true, user: safeUser(user) });
}

export function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing credentials." });

  const db = readDB();
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid username or password." });

  return res.json({ ok: true, user: safeUser(user) });
}

export function safeUser(user) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    avatarUrl: user.avatarUrl
  };
}
