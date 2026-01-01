import { loginUser } from "./auth.js";

const form = document.getElementById("loginForm");
const err = document.getElementById("loginError");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.textContent = "";

  const username = form.username.value.trim();
  const password = form.password.value;

  if (!username || !password) {
    err.textContent = "Please enter username and password.";
    return;
  }

  const res = await loginUser({ username, password });
  if (!res.ok) {
    err.textContent = res.error;
    return;
  }

  window.location.href = "search.html";
});
