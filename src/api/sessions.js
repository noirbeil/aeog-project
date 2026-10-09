// src/api/sessions.js
import { getToken } from "./auth";

const BASE_URL = "http://192.168.1.162:8000";

// Создание сессии с настройками анализа
export async function createSession(sessionData) {
  const token = getToken();
  
  if (!token) {
    throw new Error("No authentication token found. Please login again.");
  }
  
  const response = await fetch(`${BASE_URL}/sessions/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(sessionData),
  });

  const json = await response.json();

  if (!response.ok) {
    const message = typeof json.detail === "string" 
      ? json.detail 
      : "Failed to create session";
    throw new Error(message);
  }

  return json;
}

// Получение сессии по ID
export async function getSession(sessionId) {
  const token = getToken();
  
  if (!token) {
    throw new Error("No authentication token found. Please login again.");
  }
  
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to get session");
  }

  return response.json();
}

// Получение всех сессий психолога
export async function getSessions(params = {}) {
  const token = getToken();
  
  if (!token) {
    throw new Error("No authentication token found. Please login again.");
  }
  
  const queryParams = new URLSearchParams(params).toString();
  const url = queryParams ? `${BASE_URL}/sessions/?${queryParams}` : `${BASE_URL}/sessions/`;
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to get sessions");
  }

  return response.json();
}

// Обновление настроек анализа
export async function updateAnalysisConfig(sessionId, configData) {
  const token = getToken();
  
  if (!token) {
    throw new Error("No authentication token found. Please login again.");
  }
  
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/analysis-config`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(configData),
  });

  if (!response.ok) {
    throw new Error("Failed to update analysis config");
  }

  return response.json();
}

// Запуск анализа
export async function startAnalysis(sessionId) {
  const token = getToken();
  
  if (!token) {
    throw new Error("No authentication token found. Please login again.");
  }
  
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/analyze`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to start analysis");
  }

  return response.json();
}