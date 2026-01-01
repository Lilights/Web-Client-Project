import { requireAuthOrRedirect, renderTopbarUser, showToast, escapeHtml } from "./ui.js";
import { loadUsers, saveUsers, getCurrentUserId, uuid } from "./storage.js";
import { searchYouTube, formatDuration, formatViews } from "./youtube.js";

const user = requireAuthOrRedirect();
if (user) renderTopbarUser(user);

const searchForm = document.getElementById("searchForm");
const qInput = document.getElementById("qInput");
const resultsEl = document.getElementById("results");

const playerModal = document.getElementById("playerModal");
const playerHost = document.getElementById("playerHost");

const addModal = document.getElementById("addModal");
const addForm = document.getElementById("addForm");
const playlistSelect = document.getElementById("playlistSelect");
const newPlaylistName = document.getElementById("newPlaylistName");

let lastResults = [];
let pendingAddVideo = null;

// 1) Load from querystring (if exists)
const params = new URLSearchParams(window.location.search);
const initialQ = params.get("q");
if (initialQ) {
  qInput.value = initialQ;
  runSearch(initialQ);
}

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = qInput.value.trim();
  if (!q) return;

  // 2) Update querystring
  const url = new URL(window.location.href);
  url.searchParams.set("q", q);
  history.pushState({}, "", url);

  await runSearch(q);
});

async function runSearch(q) {
  resultsEl.innerHTML = `<div class="muted">Loading results...</div>`;
  try {
    lastResults = await searchYouTube(q);
    renderResults();
  } catch (err) {
    resultsEl.innerHTML = `<div class="error">${escapeHtml(err?.message || "Error")}</div>`;
  }
}

function renderResults() {
  const users = loadUsers();
  const uid = getCurrentUserId();
  const u = users.find(x => x.id === uid);

  const allSavedIds = new Set(
    (u?.playlists || [])
      .flatMap(pl => pl.items.map(it => (it.type === "youtube" ? it.id : null)))
      .filter(Boolean)
  );

  resultsEl.innerHTML = "";
  for (const v of lastResults) {
    const isSaved = allSavedIds.has(v.id);

    const card = document.createElement("div");
    card.className = "video-card";

    card.innerHTML = `
      <div class="thumb-wrap">
        <img class="thumb" src="${escapeHtml(v.thumbnail)}" alt="" />
        ${isSaved ? `<div class="badge">✓</div>` : ``}
      </div>

      <div class="title" title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</div>

      <div class="meta">
        <div>Duration: ${formatDuration(v.durationSec)}</div>
        <div>Views: ${formatViews(v.views)}</div>
      </div>

      <div class="actions">
        <button class="btn-secondary" data-play="${escapeHtml(v.id)}" type="button">Play</button>
        <button class="${isSaved ? "btn-disabled" : "btn"}"
                data-add="${escapeHtml(v.id)}"
                type="button"
                ${isSaved ? "disabled" : ""}>
          Add to Playlist
        </button>
      </div>
    `;

    // ✅ pass whole object so we can check v.embeddable
    card.querySelector("[data-play]")?.addEventListener("click", () => openPlayer(v));
    card.querySelector("[data-add]")?.addEventListener("click", () => openAddModal(v.id));

    resultsEl.appendChild(card);
  }
}

function openPlayer(video) {
  if (!video) return;

  // If embedding is blocked by uploader -> show a safe link (not popup-blocked)
  if (video.embeddable === false) {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;

    playerHost.innerHTML = `
      <div class="col" style="gap:10px; padding:16px;">
        <div class="error">This video can’t be embedded.</div>
        <a class="btn" href="${url}" target="_blank" rel="noopener noreferrer">
          Open on YouTube
        </a>
      </div>
    `;

    playerModal.classList.remove("hidden");
    playerModal.setAttribute("aria-hidden", "false");
    return;
  }

  // Normal embeddable case
  playerHost.innerHTML = `
    <iframe
      width="100%" height="420"
      src="https://www.youtube.com/embed/${encodeURIComponent(video.id)}"
      title="YouTube player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>
  `;
  playerModal.classList.remove("hidden");
  playerModal.setAttribute("aria-hidden", "false");
}


closeOnSelectors(playerModal, "[data-close-modal]", () => {
  playerModal.classList.add("hidden");
  playerModal.setAttribute("aria-hidden", "true");
  playerHost.innerHTML = "";
});

// Add modal
function openAddModal(videoId) {
  pendingAddVideo = lastResults.find(x => x.id === videoId);
  if (!pendingAddVideo) return;

  const users = loadUsers();
  const uid = getCurrentUserId();
  const u = users.find(x => x.id === uid);
  const playlists = u?.playlists || [];

  playlistSelect.innerHTML = playlists
    .map(pl => `<option value="${escapeHtml(pl.id)}">${escapeHtml(pl.name)}</option>`)
    .join("");

  newPlaylistName.value = "";
  addModal.classList.remove("hidden");
  addModal.setAttribute("aria-hidden", "false");
}

closeOnSelectors(addModal, "[data-close-add]", () => {
  addModal.classList.add("hidden");
  addModal.setAttribute("aria-hidden", "true");
  pendingAddVideo = null;
});

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!pendingAddVideo) return;

  const users = loadUsers();
  const uid = getCurrentUserId();
  const userIndex = users.findIndex(u => u.id === uid);
  if (userIndex === -1) return;

  const u = users[userIndex];

  // Create a new playlist if a name was entered
  let targetPlaylistId = playlistSelect.value;
  const newName = newPlaylistName.value.trim();
  if (newName) {
    const newPl = { id: uuid(), name: newName, createdAt: Date.now(), items: [] };
    u.playlists.push(newPl);
    targetPlaylistId = newPl.id;
  }

  const pl = u.playlists.find(p => p.id === targetPlaylistId);
  if (!pl) return;

  // Save the video (only if it does not exist in any playlist)
  const existsAnywhere = u.playlists.some(p =>
    p.items.some(it => it.type === "youtube" && it.id === pendingAddVideo.id)
  );

  if (!existsAnywhere) {
    pl.items.push({
      id: pendingAddVideo.id,
      type: "youtube",
      title: pendingAddVideo.title,
      thumbnail: pendingAddVideo.thumbnail,
      durationSec: pendingAddVideo.durationSec,
      views: pendingAddVideo.views,

      // store embeddable for playlists page fallback
      embeddable: pendingAddVideo.embeddable !== false,

      rating: 0,
      addedAt: Date.now(),
    });
    saveUsers(users);
  }

  addModal.classList.add("hidden");
  addModal.setAttribute("aria-hidden", "true");

  showToast("Saved to playlist", "Open playlist", `playlists.html?playlistId=${encodeURIComponent(pl.id)}`);
  renderResults();
});

function closeOnSelectors(modal, selector, onClose) {
  modal.querySelectorAll(selector).forEach(el => {
    el.addEventListener("click", () => onClose());
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) onClose();
  });
}
