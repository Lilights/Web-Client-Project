import { API_BASE } from "./apiConfig.js";

const form = document.getElementById("registerForm");
const err = document.getElementById("registerError");

const avatarInput = document.getElementById("avatarUrlInput") || form.avatarUrl;
const pickAvatarBtn = document.getElementById("pickAvatarBtn");

// Modal elements
const avatarModal = document.getElementById("avatarModal");
const avatarGrid = document.getElementById("avatarGrid");
const avatarPreview = document.getElementById("avatarPreview");
const avatarSeed = document.getElementById("avatarSeed");
const regenBtn = document.getElementById("regenAvatarsBtn");

function showError(msg) {
  err.textContent = msg || "";
}

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

function openAvatarModal() {
  if (!avatarModal) return;
  avatarModal.classList.remove("hidden");
  avatarModal.setAttribute("aria-hidden", "false");
}

function closeAvatarModal() {
  if (!avatarModal) return;
  avatarModal.classList.add("hidden");
  avatarModal.setAttribute("aria-hidden", "true");
}

function currentRoboSet() {
  const checked = document.querySelector('input[name="roboSet"]:checked');
  return checked?.value || "set4";
}

function robohashUrl(seed, setName = "set4") {
  // size kept moderate to load fast
  return `https://robohash.org/${encodeURIComponent(seed)}.png?size=180x180&set=${encodeURIComponent(setName)}`;
}

function renderAvatarGrid(seedBase) {
  if (!avatarGrid) return;

  const setName = currentRoboSet();
  const base = (seedBase || "").trim() || "user";
  avatarGrid.innerHTML = "";

  // build 12 options
  for (let i = 1; i <= 12; i++) {
    const seed = `${base}-${i}`;
    const url = robohashUrl(seed, setName);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "avatar-tile";
    btn.innerHTML = `<img src="${url}" alt="avatar option">`;

    btn.addEventListener("click", () => {
      avatarInput.value = url;
      if (avatarPreview) {
        avatarPreview.innerHTML = `<img src="${url}" alt="selected avatar">`;
      }
      closeAvatarModal();
    });

    avatarGrid.appendChild(btn);
  }

  // preview first one
  const firstUrl = robohashUrl(`${base}-1`, setName);
  if (avatarPreview) {
    avatarPreview.innerHTML = `<img src="${firstUrl}" alt="preview avatar">`;
  }
}

// Wire up avatar picker
pickAvatarBtn?.addEventListener("click", () => {
  const base = form.username.value.trim() || `user-${Math.random().toString(36).slice(2, 8)}`;
  if (avatarSeed) avatarSeed.value = base;
  renderAvatarGrid(base);
  openAvatarModal();
});

regenBtn?.addEventListener("click", () => {
  renderAvatarGrid(avatarSeed?.value || "");
});

document.querySelectorAll('input[name="roboSet"]').forEach(r => {
  r.addEventListener("change", () => {
    renderAvatarGrid(avatarSeed?.value || "");
  });
});

// Close modal on backdrop / X
document.querySelectorAll("[data-close-avatar]").forEach(el => {
  el.addEventListener("click", closeAvatarModal);
});

// Esc key closes modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && avatarModal && !avatarModal.classList.contains("hidden")) {
    closeAvatarModal();
  }
});

// Submit handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");

  const username = form.username.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;
  const firstName = form.firstName.value.trim();
  const avatarUrl = (avatarInput?.value || "").trim();

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

  // Avatar is optional; if empty, auto-generate a stable one
  const finalAvatarUrl = avatarUrl || robohashUrl(username || firstName || "user", "set4");

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, firstName, avatarUrl: finalAvatarUrl }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showError(data?.error || data?.message || "Registration failed.");
      return;
    }

    window.location.href = "login.html";
  } catch (e2) {
    showError(`Cannot reach server. Is it running? (${e2?.message || "network error"})`);
  }
});
