import { API_BASE } from "./apiConfig.js";
import { setCurrentUserId, loadUsers, saveUsers, uuid } from "./storage.js";

export function passwordIsValid(pw) {
  if (typeof pw !== "string" || pw.length < 6) return false;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  return hasLetter && hasDigit && hasSpecial;
}

function ensureLocalUser(safeUser) {
  if (!safeUser?.id) return null;

  const users = loadUsers();
  const idx = users.findIndex(u => u.id === safeUser.id);

  const existing = idx >= 0 ? users[idx] : null;

  const user = {
    id: safeUser.id,
    username: safeUser.username || existing?.username || "",
    firstName: safeUser.firstName || existing?.firstName || "",
    avatarUrl: safeUser.avatarUrl || existing?.avatarUrl || "",
    // Keep existing playlists if they exist; otherwise create default
    playlists: existing?.playlists?.length
      ? existing.playlists
      : [{ id: uuid(), name: "Favorites", createdAt: Date.now(), items: [] }],
  };

  if (idx >= 0) users[idx] = user;
  else users.push(user);

  saveUsers(users);
  return user;
}

// Server-side register
export async function registerUser({ username, password, firstName, avatarUrl }) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, firstName, avatarUrl }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json?.error || "Register failed." };

  // Make sure localStorage has this user so the UI guard works later
  ensureLocalUser(json.user);

  return { ok: true, user: json.user };
}

// Server-side login
export async function loginUser({ username, password }) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json?.error || "Login failed." };

  // Save session userId (guard reads this)
  setCurrentUserId(json.user.id);

  // Also sync to localStorage so requireAuthOrRedirect() finds it
  const localUser = ensureLocalUser(json.user);

  return { ok: true, user: localUser || json.user };
}
