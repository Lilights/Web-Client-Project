import { API_BASE } from "./apiConfig.js";

const form = document.getElementById("registerForm");
const err = document.getElementById("registerError");

// Optional: if you have the avatar picker
const avatarInput = document.getElementById("avatarUrlInput") || form.avatarUrl;

function passwordRuleText() {
  return "Password must be at least 6 characters and include: a letter, a digit, and a special character (e.g. !@#$).";
}

function passwordIsValid(pw) {
  if (typeof pw !== "string" || pw.length < 6) return false;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  return hasLetter && hasDigit && hasSpecial;
}

function showError(msg) {
  err.textContent = msg || "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");

  const username = form.username.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;
  const firstName = form.firstName.value.trim();
  const avatarUrl = (avatarInput?.value || "").trim();

  // Frontend validation (shows clear errors)
  if (!username || !password || !confirmPassword || !firstName) {
    showError("Please fill in: Username, Password, Confirm Password, and First Name.");
    return;
  }

  if (password !== confirmPassword) {
    showError("Passwords do not match.");
    return;
  }

  if (!passwordIsValid(password)) {
    showError(passwordRuleText());
    return;
  }

  // Call backend
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, firstName, avatarUrl }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Show server error if present, otherwise generic
      showError(data?.error || data?.message || "Registration failed.");
      return;
    }

    // Success -> go login
    window.location.href = "login.html";
  } catch (e2) {
    // Typically server not running / wrong API_BASE / CORS
    showError(`Cannot reach server. Is it running? (${e2?.message || "network error"})`);
  }
});
