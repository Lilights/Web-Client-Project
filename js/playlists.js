import { requireAuthOrRedirect, renderTopbarUser, showToast, escapeHtml } from "./ui.js";
import { loadUsers, saveUsers, getCurrentUserId, uuid } from "./storage.js";
import { formatDuration, formatViews } from "./youtube.js";

const user = requireAuthOrRedirect();
if (user) renderTopbarUser(user);

const plListEl = document.getElementById("plList");
const itemsEl = document.getElementById("items");
const mainHeader = document.getElementById("mainHeader");
const filterInput = document.getElementById("filterInput");
const sortSelect = document.getElementById("sortSelect");
const deletePlBtn = document.getElementById("deletePlBtn");
const newPlBtn = document.getElementById("newPlBtn");

// modal
const plPlayerModal = document.getElementById("plPlayerModal");
const plPlayerHost = document.getElementById("plPlayerHost");

let activePlaylistId = null;

initFromQuerystring();
renderAll();

filterInput.addEventListener("input", () => renderItems());
sortSelect.addEventListener("change", () => renderItems());

newPlBtn.addEventListener("click", () => {
  const name = prompt("New playlist name:");
  if (!name?.trim()) return;

  const users = loadUsers();
  const uid = getCurrentUserId();
  const u = users.find(x => x.id === uid);
  if (!u) return;

  const pl = { id: uuid(), name: name.trim(), createdAt: Date.now(), items: [] };
  u.playlists.push(pl);
  saveUsers(users);

  setActivePlaylist(pl.id, true);
  showToast("Playlist created", "Open", `playlists.html?playlistId=${encodeURIComponent(pl.id)}`);
});

deletePlBtn.addEventListener("click", () => {
  const users = loadUsers();
  const uid = getCurrentUserId();
  const u = users.find(x => x.id === uid);
  if (!u) return;

  const pl = u.playlists.find(p => p.id === activePlaylistId);
  if (!pl) return;

  if (!confirm(`Delete playlist "${pl.name}"?`)) return;

  u.playlists = u.playlists.filter(p => p.id !== activePlaylistId);
  saveUsers(users);

  activePlaylistId = u.playlists[0]?.id || null;
  syncQuerystring();
  renderAll();
});

function initFromQuerystring() {
  const params = new URLSearchParams(window.location.search);
  const pid = params.get("playlistId");
  if (pid) activePlaylistId = pid;
}

function setActivePlaylist(pid, pushState) {
  activePlaylistId = pid;
  syncQuerystring(pushState);
  renderAll();
}

function syncQuerystring(pushState = false) {
  const url = new URL(window.location.href);
  if (activePlaylistId) url.searchParams.set("playlistId", activePlaylistId);
  else url.searchParams.delete("playlistId");

  if (pushState) history.pushState({}, "", url);
  else history.replaceState({}, "", url);
}

function renderAll() {
  const users = loadUsers();
  const uid = getCurrentUserId();
  const u = users.find(x => x.id === uid);
  const pls = u?.playlists || [];

  if (!activePlaylistId && pls.length > 0) {
    activePlaylistId = pls[0].id;
    syncQuerystring(false);
  }

  renderSidebar(pls);
  renderItems();
}

function renderSidebar(playlists) {
  if (playlists.length === 0) {
    plListEl.innerHTML = `<div class="muted">No playlists yet.</div>`;
    return;
  }

  plListEl.innerHTML = playlists.map(pl => `
    <div class="row" style="gap:8px;">
      <button class="pl-item ${pl.id === activePlaylistId ? "active" : ""}"
              type="button"
              data-pl="${escapeHtml(pl.id)}"
              style="flex:1;">
        <span>${escapeHtml(pl.name)}</span>
        <span class="count">${pl.items.length}</span>
      </button>
      <button class="btn-secondary"
              type="button"
              data-plplay="${escapeHtml(pl.id)}"
              title="Play playlist">▶</button>
    </div>
  `).join("");

  plListEl.querySelectorAll("[data-pl]").forEach(btn => {
    btn.addEventListener("click", () => setActivePlaylist(btn.dataset.pl, true));
  });

  plListEl.querySelectorAll("[data-plplay]").forEach(btn => {
    btn.addEventListener("click", () => playPlaylist(btn.dataset.plplay));
  });
}

function renderItems() {
  const users = loadUsers();
  const uid = getCurrentUserId();
  const u = users.find(x => x.id === uid);
  const pl = (u?.playlists || []).find(p => p.id === activePlaylistId);

  if (!pl) {
    mainHeader.innerHTML = `<div class="muted">Select a playlist from the sidebar.</div>`;
    itemsEl.innerHTML = "";
    return;
  }

  mainHeader.innerHTML = `
    <div class="row" style="justify-content:space-between;">
      <h3 style="margin:0;">${escapeHtml(pl.name)}</h3>
      <button class="btn-secondary" type="button" id="mainPlayBtn">Play</button>
    </div>
  `;

  document.getElementById("mainPlayBtn")?.addEventListener("click", () => playPlaylist(pl.id));

  const q = filterInput.value.trim().toLowerCase();
  let items = [...pl.items];

  if (q) items = items.filter(it => (it.title || "").toLowerCase().includes(q));

  const sortMode = sortSelect.value;
  if (sortMode === "az") {
    items.sort((a, b) => (a.title || "").localeCompare(b.title || "", "en"));
  } else {
    items.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  }

  if (items.length === 0) {
    itemsEl.innerHTML = `<div class="muted">No items to display.</div>`;
    return;
  }

  itemsEl.innerHTML = items.map(it => `
    <div class="pl-row">
      <img class="thumb-sm" src="${escapeHtml(it.thumbnail || "")}" alt="" />
      <div class="pl-info">
        <div class="pl-title">${escapeHtml(it.title)}</div>
        <div class="pl-meta">
          ${it.type === "youtube"
            ? `Duration: ${formatDuration(it.durationSec)} · Views: ${formatViews(it.views)}`
            : `MP3 file`}
        </div>
      </div>

      <div class="rating" data-id="${escapeHtml(it.id)}">
        ${renderStars(it.rating || 0)}
      </div>

      <div class="pl-actions">
        ${it.type === "youtube"
          ? `<button class="btn-secondary" type="button" data-playone="${escapeHtml(it.id)}">Play</button>`
          : ""}
        <button class="btn-danger" type="button" data-del="${escapeHtml(it.id)}">Delete</button>
      </div>
    </div>
  `).join("");

  // Play-one fallback based on saved embeddable flag
  itemsEl.querySelectorAll("[data-playone]").forEach(btn => {
    btn.addEventListener("click", () => {
      const vid = btn.dataset.playone;

      const users2 = loadUsers();
      const uid2 = getCurrentUserId();
      const u2 = users2.find(x => x.id === uid2);
      const pl2 = (u2?.playlists || []).find(p => p.id === activePlaylistId);
      const it = pl2?.items.find(x => x.type === "youtube" && x.id === vid);

      if (it?.embeddable === false) {
      const url = `https://www.youtube.com/watch?v=${encodeURIComponent(vid)}`;
      plPlayerHost.innerHTML = `
        <div class="col" style="gap:10px; padding:16px;">
          <div class="error">This video can’t be embedded.</div>
          <a class="btn" href="${url}" target="_blank" rel="noopener noreferrer">
            Open on YouTube
          </a>
        </div>
      `;
      plPlayerModal.classList.remove("hidden");
      plPlayerModal.setAttribute("aria-hidden", "false");
      return;
    }

      openPlayer(vid);
    });
  });

  itemsEl.querySelectorAll(".rating").forEach(el => {
    el.querySelectorAll("[data-star]").forEach(st => {
      st.addEventListener("click", () => {
        const newRating = Number(st.dataset.star);
        setRating(pl.id, el.dataset.id, newRating);
      });
    });
  });

  itemsEl.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => deleteItem(pl.id, btn.dataset.del));
  });
}

function renderStars(r) {
  return [1, 2, 3, 4, 5].map(n => `
    <button class="star ${n <= r ? "on" : ""}"
            type="button"
            data-star="${n}"
            aria-label="rate ${n}">★</button>
  `).join("");
}

function setRating(playlistId, itemId, rating) {
  const users = loadUsers();
  const uid = getCurrentUserId();
  const u = users.find(x => x.id === uid);
  const pl = (u?.playlists || []).find(p => p.id === playlistId);
  const it = pl?.items.find(x => x.id === itemId);
  if (!it) return;

  it.rating = rating;
  saveUsers(users);
  renderItems();
}

function deleteItem(playlistId, itemId) {
  const users = loadUsers();
  const uid = getCurrentUserId();
  const u = users.find(x => x.id === uid);
  const pl = (u?.playlists || []).find(p => p.id === playlistId);
  if (!pl) return;

  pl.items = pl.items.filter(x => x.id !== itemId);
  saveUsers(users);
  showToast("Removed from playlist");
  renderAll();
}

function playPlaylist(playlistId) {
  const users = loadUsers();
  const uid = getCurrentUserId();
  const u = users.find(x => x.id === uid);
  const pl = (u?.playlists || []).find(p => p.id === playlistId);
  if (!pl) return;

  const first = pl.items.find(it => it.type === "youtube");
  if (!first) {
    showToast("No YouTube videos in this playlist.");
    return;
  }

if (first.embeddable === false) {
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(first.id)}`;
  plPlayerHost.innerHTML = `
    <div class="col" style="gap:10px; padding:16px;">
      <div class="error">This video can’t be embedded.</div>
      <a class="btn" href="${url}" target="_blank" rel="noopener noreferrer">
        Open on YouTube
      </a>
    </div>
  `;
  plPlayerModal.classList.remove("hidden");
  plPlayerModal.setAttribute("aria-hidden", "false");
  return;
}


  openPlayer(first.id);
}

function openPlayer(videoId) {
  plPlayerHost.innerHTML = `
    <iframe
      width="100%" height="420"
      src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}"
      title="YouTube player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>
  `;
  plPlayerModal.classList.remove("hidden");
  plPlayerModal.setAttribute("aria-hidden", "false");
}

function closePlayer() {
  plPlayerModal.classList.add("hidden");
  plPlayerModal.setAttribute("aria-hidden", "true");
  plPlayerHost.innerHTML = "";
}

plPlayerModal?.querySelectorAll("[data-close-plmodal]").forEach(el => {
  el.addEventListener("click", closePlayer);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && plPlayerModal && !plPlayerModal.classList.contains("hidden")) {
    closePlayer();
  }
});
