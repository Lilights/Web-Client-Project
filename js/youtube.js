import { API_BASE } from "./apiConfig.js";

export async function searchYouTube(query) {
  const q = encodeURIComponent(query);
  const url = `${API_BASE}/api/youtube/search?q=${q}`;

  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || "YouTube search failed");
  }
  return data;
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
