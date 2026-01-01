import { YT } from "./config.js";

export async function searchYouTube(query) {
  const q = encodeURIComponent(query);
  const searchUrl =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${YT.maxResults}&q=${q}&key=${YT.apiKey}`;

  const searchRes = await fetch(searchUrl);
  const searchJson = await searchRes.json();
  if (!searchRes.ok) throw new Error(searchJson?.error?.message || "YouTube search failed");

  const ids = (searchJson.items || []).map(it => it.id?.videoId).filter(Boolean);
  if (ids.length === 0) return [];

  // ✅ Add `status` so we can read `status.embeddable`
  const detailsUrl =
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet,status&id=${ids.join(",")}&key=${YT.apiKey}`;

  const detailsRes = await fetch(detailsUrl);
  const detailsJson = await detailsRes.json();
  if (!detailsRes.ok) throw new Error(detailsJson?.error?.message || "YouTube details failed");

  return (detailsJson.items || []).map(v => ({
    id: v.id,
    title: v.snippet?.title || "",
    thumbnail: v.snippet?.thumbnails?.medium?.url || "",
    durationSec: isoDurationToSeconds(v.contentDetails?.duration || "PT0S"),
    views: Number(v.statistics?.viewCount || 0),

    // ✅ If uploader blocks embedding, this will be false
    embeddable: v.status?.embeddable !== false,
  }));
}

function isoDurationToSeconds(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso) || [];
  const h = Number(m[1] || 0), min = Number(m[2] || 0), s = Number(m[3] || 0);
  return h * 3600 + min * 60 + s;
}

export function formatDuration(sec) {
  sec = Number(sec || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatViews(n) {
  n = Number(n || 0);
  return n.toLocaleString("en-US");
}
