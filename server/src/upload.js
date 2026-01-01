import path from "path";

// multer puts file at req.file
export function uploadMp3(req, res) {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  const filename = req.file.filename;

  // This URL works locally and on Render (same server)
  const url = `/uploads/${filename}`;

  // You’ll store this URL in playlist items as type: "mp3"
  return res.json({
    ok: true,
    file: {
      id: filename,
      type: "mp3",
      title: req.body?.title || filename,
      url
    }
  });
}
