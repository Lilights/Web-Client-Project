import { readDB, writeDB, uuid } from "./db.js";

function getUser(db, userId) {
  return db.users.find(u => u.id === userId);
}

// GET /api/users/:userId/playlists
export function listPlaylists(req, res) {
  const { userId } = req.params;
  const db = readDB();
  const u = getUser(db, userId);
  if (!u) return res.status(404).json({ error: "User not found." });
  return res.json({ ok: true, playlists: u.playlists });
}

// POST /api/users/:userId/playlists
export function createPlaylist(req, res) {
  const { userId } = req.params;
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "Name required." });

  const db = readDB();
  const u = getUser(db, userId);
  if (!u) return res.status(404).json({ error: "User not found." });

  const pl = { id: uuid(), name: name.trim(), createdAt: Date.now(), items: [] };
  u.playlists.push(pl);
  writeDB(db);
  return res.json({ ok: true, playlist: pl });
}

// DELETE /api/users/:userId/playlists/:playlistId
export function deletePlaylist(req, res) {
  const { userId, playlistId } = req.params;
  const db = readDB();
  const u = getUser(db, userId);
  if (!u) return res.status(404).json({ error: "User not found." });

  const before = u.playlists.length;
  u.playlists = u.playlists.filter(p => p.id !== playlistId);
  if (u.playlists.length === before) return res.status(404).json({ error: "Playlist not found." });

  writeDB(db);
  return res.json({ ok: true });
}

// POST /api/users/:userId/playlists/:playlistId/items
export function addItem(req, res) {
  const { userId, playlistId } = req.params;
  const item = req.body || {};

  if (!item || !item.id || !item.type) {
    return res.status(400).json({ error: "Item must include id and type." });
  }

  const db = readDB();
  const u = getUser(db, userId);
  if (!u) return res.status(404).json({ error: "User not found." });

  const pl = u.playlists.find(p => p.id === playlistId);
  if (!pl) return res.status(404).json({ error: "Playlist not found." });

  const exists = u.playlists.some(p => p.items.some(it => it.type === item.type && it.id === item.id));
  if (exists) return res.status(409).json({ error: "Item already saved in a playlist." });

  const newItem = {
    ...item,
    rating: Number(item.rating || 0),
    addedAt: Date.now()
  };

  pl.items.push(newItem);
  writeDB(db);
  return res.json({ ok: true, item: newItem });
}

// PATCH /api/users/:userId/playlists/:playlistId/items/:itemId
export function updateItem(req, res) {
  const { userId, playlistId, itemId } = req.params;
  const { rating } = req.body || {};

  const db = readDB();
  const u = getUser(db, userId);
  if (!u) return res.status(404).json({ error: "User not found." });

  const pl = u.playlists.find(p => p.id === playlistId);
  if (!pl) return res.status(404).json({ error: "Playlist not found." });

  const it = pl.items.find(x => x.id === itemId);
  if (!it) return res.status(404).json({ error: "Item not found." });

  it.rating = Number(rating || 0);
  writeDB(db);
  return res.json({ ok: true, item: it });
}

// DELETE /api/users/:userId/playlists/:playlistId/items/:itemId
export function deleteItem(req, res) {
  const { userId, playlistId, itemId } = req.params;

  const db = readDB();
  const u = getUser(db, userId);
  if (!u) return res.status(404).json({ error: "User not found." });

  const pl = u.playlists.find(p => p.id === playlistId);
  if (!pl) return res.status(404).json({ error: "Playlist not found." });

  const before = pl.items.length;
  pl.items = pl.items.filter(x => x.id !== itemId);
  if (pl.items.length === before) return res.status(404).json({ error: "Item not found." });

  writeDB(db);
  return res.json({ ok: true });
}
