import "dotenv/config";

import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";

import { register, login } from "./src/auth.js";
import {
  listPlaylists,
  createPlaylist,
  deletePlaylist,
  addItem,
  updateItem,
  deleteItem
} from "./src/playlists.js";
import { uploadMp3 } from "./src/upload.js";

const app = express();

/**
 * CORS:
 * - local dev (Live Server)
 * - GitHub Pages deployment
 */
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "https://lilights.github.io"
    ],
  })
);

app.use(express.json({ limit: "2mb" }));

/** Serve uploaded mp3 files */
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/** Multer upload config */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), "uploads")),
  filename: (req, file, cb) => {
    const safe = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safe);
  },
});
const upload = multer({ storage });

/** Auth */
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);

/** Playlists */
app.get("/api/users/:userId/playlists", listPlaylists);
app.post("/api/users/:userId/playlists", createPlaylist);
app.delete("/api/users/:userId/playlists/:playlistId", deletePlaylist);

app.post("/api/users/:userId/playlists/:playlistId/items", addItem);
app.patch("/api/users/:userId/playlists/:playlistId/items/:itemId", updateItem);
app.delete("/api/users/:userId/playlists/:playlistId/items/:itemId", deleteItem);

/** MP3 upload */
app.post("/api/upload", upload.single("file"), uploadMp3);

/**
 * YouTube proxy:
 * Frontend calls: GET /api/youtube/search?q=adele%20hello
 * Server calls YouTube API with key from server/.env
 */
app.get("/api/youtube/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Missing q" });

    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      return res
        .status(500)
        .json({ error: "Missing YOUTUBE_API_KEY. Put it in server/.env" });
    }

    // 1) Search request
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "12");
    searchUrl.searchParams.set("q", q);
    searchUrl.searchParams.set("key", key);

    const sRes = await fetch(searchUrl);
    const sJson = await sRes.json();
    if (!sRes.ok) return res.status(sRes.status).json(sJson);

    const ids = (sJson.items || [])
      .map((it) => it.id?.videoId)
      .filter(Boolean);

    if (ids.length === 0) return res.json([]);

    // 2) Details request (duration, views, thumbnails)
    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.searchParams.set("part", "contentDetails,statistics,snippet");
    detailsUrl.searchParams.set("id", ids.join(","));
    detailsUrl.searchParams.set("key", key);

    const dRes = await fetch(detailsUrl);
    const dJson = await dRes.json();
    if (!dRes.ok) return res.status(dRes.status).json(dJson);

    const out = (dJson.items || []).map((v) => ({
      id: v.id,
      title: v.snippet?.title || "",
      thumbnail: v.snippet?.thumbnails?.medium?.url || "",
      durationSec: isoDurationToSeconds(v.contentDetails?.duration || "PT0S"),
      views: Number(v.statistics?.viewCount || 0),
    }));

    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

/** Helper */
function isoDurationToSeconds(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso) || [];
  const h = Number(m[1] || 0),
    min = Number(m[2] || 0),
    s = Number(m[3] || 0);
  return h * 3600 + min * 60 + s;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
