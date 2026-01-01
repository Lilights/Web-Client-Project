import { API_BASE } from "./apiConfig.js";
import { setCurrentUserId } from "./storage.js";

export function passwordIsValid(pw) {
  if (typeof pw !== "string" || pw.length < 6) return false;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  return hasLetter && hasDigit && hasSpecial;
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

  // Optional: auto-login after register (if you want)
  // setCurrentUserId(json.user.id);

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

  // ✅ This keeps your existing "auth guard" logic working
  setCurrentUserId(json.user.id);

  return { ok: true, user: json.user };
}
