// src/api/compare.js
import { getToken } from "./auth";

const BASE_URL = "http://192.168.1.162:8000";

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

/** Даты сеансов пациента — для подсказок в датепикере */
export async function getPatientSessionDates(patientId) {
  const res = await fetch(
    `${BASE_URL}/compare/patient-session-dates?patient_id=${patientId}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error("Не удалось загрузить даты сеансов");
  return res.json(); // [{ session_id, date, label }]
}

/** Сравнение двух сеансов */
export async function compareSessions(sessionId1, sessionId2) {
  const res = await fetch(
    `${BASE_URL}/compare/sessions?session_id_1=${sessionId1}&session_id_2=${sessionId2}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.detail || "Ошибка сравнения сеансов");
  }
  return res.json();
}