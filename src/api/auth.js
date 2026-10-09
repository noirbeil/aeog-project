// src/api/auth.js
// Все запросы к бэкенду для авторизации и регистрации

const BASE_URL = "http://192.168.1.162:8000";

// Токен хранится в памяти (не localStorage — Electron не поддерживает)
let _token = null;

export function setToken(token) {
  _token = token;
}

export function getToken() {
  return _token;
}

export function clearToken() {
  _token = null;
}

// ------------------------------------
// РЕГИСТРАЦИЯ
// ------------------------------------
// Принимает объект с полями: name, surname, login, password, specialization, licenseNumber
// Возвращает: { access_token, token_type }
export async function registerPsychologist(data) {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name:           data.name,
      surname:        data.surname,
      login:          data.login,
      password:       data.password,
      specialization: data.specialization || null,
      license_number: data.licenseNumber  || null,
      role:           "psychologist",
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    // FastAPI возвращает { detail: "..." } при ошибке
    const message =
      typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
    throw new Error(message);
  }

  return json; // { access_token, token_type }
}

// ------------------------------------
// ВХОД
// ------------------------------------
export async function loginPsychologist(login, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });

  const json = await response.json();

  if (!response.ok) {
    const message =
      typeof json.detail === "string" ? json.detail : "Неверный логин или пароль";
    throw new Error(message);
  }

  return json; // { access_token, token_type }
}

// ------------------------------------
// ПОЛУЧИТЬ ДАННЫЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ------------------------------------
// Возвращает: { id, name, surname, login, role, created_at }
export async function getMe() {
  const response = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${_token}` },
  });

  if (!response.ok) throw new Error("Не удалось получить данные пользователя");
  return response.json();
}

export async function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  
  const response = await fetch(`${BASE_URL}/auth/me`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  
  if (!response.ok) return null;
  return response.json();
}