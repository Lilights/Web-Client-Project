import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";

import { register, login } from "./src/auth.js";
import { listPlaylists, createPlaylist, deletePlaylist, addItem, updateItem, deleteItem } from "./src/playlists.js";
import { uploadMp3 } from "./src/upload.js";

const app = express();

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://lilights.github.io"
  ]
}));

app.use(express.json({ limit: "2mb" }));

// Serve uploaded mp3 files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Multer upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), "uploads")),
  filename: (req, file, cb) => {
    const safe = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safe);
  }
});
const upload = multer({ storage });

// Auth
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);

// Playlists
app.get("/api/users/:userId/playlists", listPlaylists);
app.post("/api/users/:userId/playlists", createPlaylist);
app.delete("/api/users/:userId/playlists/:playlistId", deletePlaylist);

app.post("/api/users/:userId/playlists/:playlistId/items", addItem);
app.patch("/api/users/:userId/playlists/:playlistId/items/:itemId", updateItem);
app.delete("/api/users/:userId/playlists/:playlistId/items/:itemId", deleteItem);

// MP3 upload
app.post("/api/upload", upload.single("file"), uploadMp3);

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
