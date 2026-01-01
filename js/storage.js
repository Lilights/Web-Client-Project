import { APP } from "./config.js";

export function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(APP.usersKey)) || [];
  } catch {
    return [];
  }
}

export function saveUsers(users) {
  localStorage.setItem(APP.usersKey, JSON.stringify(users));
}

export function getCurrentUserId() {
  try {
    const obj = JSON.parse(sessionStorage.getItem(APP.currentUserKey));
    return obj?.userId || null;
  } catch {
    return null;
  }
}

export function setCurrentUserId(userId) {
  sessionStorage.setItem(APP.currentUserKey, JSON.stringify({ userId }));
}

export function clearCurrentUser() {
  sessionStorage.removeItem(APP.currentUserKey);
}

export function findUserById(users, userId) {
  return users.find(u => u.id === userId) || null;
}

export function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
