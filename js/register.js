import { registerUser, passwordIsValid } from "./auth.js";

const form = document.getElementById("registerForm");
const err = document.getElementById("registerError");

const avatarUrlInput = document.getElementById("avatarUrlInput");
const pickAvatarBtn = document.getElementById("pickAvatarBtn");

// Modal elements
const avatarModal = document.getElementById("avatarModal");
const avatarGrid = document.getElementById("avatarGrid");
const avatarSeed = document.getElementById("avatarSeed");
const regenAvatarsBtn = document.getElementById("regenAvatarsBtn");
const avatarPreview = document.getElementById("avatarPreview");

pickAvatarBtn?.addEventListener("click", () => openAvatarModal());

regenAvatarsBtn?.addEventListener("click", () => {
  const seed = avatarSeed.value.trim() || randomSeed();
  renderAvatarGrid(seed, getSelectedSet());
});

avatarSeed?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const seed = avatarSeed.value.trim() || randomSeed();
    renderAvatarGrid(seed, getSelectedSet());
  }
});

avatarModal?.querySelectorAll("[data-close-avatar]").forEach(el => {
  el.addEventListener("click", closeAvatarModal);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && avatarModal && !avatarModal.classList.contains("hidden")) {
    closeAvatarModal();
  }
});

// Update avatars when user changes set
document.querySelectorAll('input[name="roboSet"]').forEach(r => {
  r.addEventListener("change", () => {
    const seed = avatarSeed.value.trim() || randomSeed();
    renderAvatarGrid(seed, getSelectedSet());
  });
});

function getSelectedSet() {
  const el = document.querySelector('input[name="roboSet"]:checked');
  return el?.value || "set1";
}

function openAvatarModal() {
  avatarModal.classList.remove("hidden");
  avatarModal.setAttribute("aria-hidden", "false");

  const username = form?.username?.value?.trim();
  const seed = username || avatarSeed.value.trim() || randomSeed();
  avatarSeed.value = seed;

  renderAvatarGrid(seed, getSelectedSet());
}

function closeAvatarModal() {
  avatarModal.classList.add("hidden");
  avatarModal.setAttribute("aria-hidden", "true");
}

function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

function buildRobohashUrl(seed, set, size = "150x150") {
  const s = encodeURIComponent(seed);
  const st = encodeURIComponent(set);
  return `https://robohash.org/${s}.png?set=${st}&size=${size}`;
}

function renderAvatarGrid(seed, set) {
  const options = [];
  for (let i = 1; i <= 12; i++) {
    options.push(buildRobohashUrl(`${seed}-${i}`, set, "160x160"));
  }

  const previewUrl = options[0];
  avatarPreview.innerHTML = `
    <div class="muted" style="margin-bottom:6px;">Preview</div>
    <div class="avatar-preview-box">
      <img src="${previewUrl}" alt="avatar preview" />
      <div class="muted" style="margin-top:6px; font-size:12px;">Click an option below to select</div>
    </div>
  `;

  avatarGrid.innerHTML = options.map(url => `
    <button class="avatar-choice" type="button" data-url="${url}" title="Use this avatar">
      <img src="${url}" alt="avatar option" />
    </button>
  `).join("");

  avatarGrid.querySelectorAll("[data-url]").forEach(btn => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-url");
      avatarUrlInput.value = url;
      avatarPreview.querySelector("img")?.setAttribute("src", url);
      closeAvatarModal();
    });
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.textContent = "";

  const username = form.username.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;
  const firstName = form.firstName.value.trim();
  const avatarUrl = avatarUrlInput.value.trim();

  if (!username || !password || !confirmPassword || !firstName || !avatarUrl) {
    err.textContent = "All fields are required.";
    return;
  }
  if (!passwordIsValid(password)) {
    err.textContent = "Password must be at least 6 characters and include a letter, a number, and a special character.";
    return;
  }
  if (password !== confirmPassword) {
    err.textContent = "Passwords do not match.";
    return;
  }

  const res = await registerUser({ username, password, firstName, avatarUrl });
  if (!res.ok) {
    err.textContent = res.error;
    return;
  }

  // After successful register, go to login
  window.location.href = "login.html";
});
