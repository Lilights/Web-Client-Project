import { loadUsers, getCurrentUserId, findUserById, clearCurrentUser } from "./storage.js";

export function requireAuthOrRedirect() {
  const uid = getCurrentUserId();
  if (!uid) {
    window.location.href = "login.html";
    return null;
  }
  const users = loadUsers();
  const user = findUserById(users, uid);
  if (!user) {
    clearCurrentUser();
    window.location.href = "login.html";
    return null;
  }
  return user;
}

export function renderTopbarUser(user) {
  const el = document.querySelector("[data-topbar-user]");
  if (!el) return;

  el.innerHTML = `
    <div class="topbar-right">
      <div class="topbar-user">
        <img class="avatar-sm" src="${escapeHtml(user.avatarUrl)}" alt="avatar" />
        <div class="hello-text">Hello ${escapeHtml(user.firstName || user.username)}</div>
      </div>
      <button class="btn-mini" id="logoutBtn" type="button">Logout</button>
    </div>
  `;

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    clearCurrentUser();
    window.location.href = "login.html";
  });
}



export function showToast(message, actionText, actionHref) {
  const host = document.getElementById("toastHost");
  if (!host) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <div class="toast-msg">${escapeHtml(message)}</div>
    ${actionHref ? `<a class="toast-action" href="${actionHref}">${escapeHtml(actionText || "פתח")}</a>` : ""}
    <button class="toast-close" type="button">×</button>
  `;
  host.appendChild(toast);

  toast.querySelector(".toast-close")?.addEventListener("click", () => toast.remove());
  setTimeout(() => toast.remove(), 4500);
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, ch => (
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[ch]
  ));
}
