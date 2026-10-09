// src/api/sessions.js
// Все запросы к бэкенду для работы с проектами (сессиями)

import { getToken } from "./auth";

const BASE_URL = "http://192.168.1.162:8000";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// ------------------------------------
// ПОЛУЧИТЬ СПИСОК ПРОЕКТОВ
// ------------------------------------
// Параметры фильтрации все необязательные:
//   search      — поиск по ФИО пациента (строка)
//   dateFrom    — дата от (YYYY-MM-DD)
//   dateTo      — дата до (YYYY-MM-DD)
//   status      — статус сессии
//   page        — номер страницы (с 1)
//   pageSize    — сколько на странице
//
// Возвращает: { items: [...], total: N, page: N, pages: N }
export async function getSessions({
  search = "",
  dateFrom = null,
  dateTo = null,
  status = null,
  page = 1,
  pageSize = 8,
} = {}) {
  const skip = (page - 1) * pageSize;

  // Собираем query-параметры
  const params = new URLSearchParams();
  params.set("skip", skip);
  params.set("limit", pageSize);
  if (status)   params.set("status_filter", status);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo)   params.set("date_to", dateTo);

  const response = await fetch(
    `${BASE_URL}/sessions/?${params.toString()}`,
    { headers: authHeaders() }
  );

  if (!response.ok) throw new Error("Не удалось загрузить список проектов");
  return response.json(); // массив сессий
}

// ------------------------------------
// ПОЛУЧИТЬ СПИСОК ПРОЕКТОВ — РАСШИРЕННЫЙ (с данными пациента)
// ------------------------------------
// Использует новый эндпоинт /sessions/list который возвращает
// склеенные данные сессии + пациента + последней записи
export async function getProjectList({
  search = "",
  dateFrom = null,
  dateTo = null,
  page = 1,
  pageSize = 8,
} = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("page_size", pageSize);
  if (search)   params.set("search", search);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo)   params.set("date_to", dateTo);

  const response = await fetch(
    `${BASE_URL}/sessions/list?${params.toString()}`,
    { headers: authHeaders() }
  );

  if (!response.ok) throw new Error("Не удалось загрузить список проектов");
  return response.json();
  // {
  //   items: [
  //     {
  //       id, project_name, session_date, status,
  //       patient_name, patient_surname,
  //       last_audio_date,       // дата последней аудиозаписи или null
  //       analysis_status,       // pending / processing / completed / failed
  //       dominant_emotion,      // если анализ завершён
  //     },
  //     ...
  //   ],
  //   total: 24,
  //   page: 1,
  //   pages: 3,
  // }
}

// ------------------------------------
// ПОЛУЧИТЬ ОДНУ СЕССИЮ
// ------------------------------------
export async function getSession(sessionId) {
  const response = await fetch(
    `${BASE_URL}/sessions/${sessionId}`,
    { headers: authHeaders() }
  );
  if (!response.ok) throw new Error("Сессия не найдена");
  return response.json();
}

// ------------------------------------
// СОЗДАТЬ ПРОЕКТ
// ------------------------------------
export async function createProject(data) {
  const response = await fetch(`${BASE_URL}/sessions/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await response.json();
  if (!response.ok) {
    const msg = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
    throw new Error(msg);
  }
  return json;
}

// ------------------------------------
// ПОСЛЕДНИЕ ЗАПИСИ ГОЛОСА
// ------------------------------------
export async function getRecentVoiceRecords(limit = 5) {
  const params = new URLSearchParams();
  params.set("limit", limit);

  const response = await fetch(
    `${BASE_URL}/sessions/recent-voice-records?${params.toString()}`,
    { 
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      } 
    }
  );

  if (!response.ok) throw new Error("Не удалось загрузить последние записи");
  return response.json();
}