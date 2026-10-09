// src/api/audio.js
import { getToken } from "./auth";

const BASE_URL = "http://192.168.1.162:8000";

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
  };
}

// Загрузка аудиофайла для сессии
export async function uploadAudio(sessionId, audioFile) {
  const token = getToken();
  
  if (!token) {
    throw new Error("No authentication token found. Please login again.");
  }

  const formData = new FormData();
  formData.append("session_id", sessionId.toString());
  formData.append("file", audioFile);

  const response = await fetch(`${BASE_URL}/audio/upload`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData,
  });

  const json = await response.json();

  if (!response.ok) {
    const message = typeof json.detail === "string" 
      ? json.detail 
      : "Failed to upload audio";
    throw new Error(message);
  }

  // После успешной загрузки запускаем анализ
  try {
    await startAnalysis(sessionId);
  } catch (analysisErr) {
    console.warn("Analysis start warning:", analysisErr);
    // Не прерываем выполнение, анализ может запуститься позже
  }

  return json;
}

// Запуск анализа для сессии
export async function startAnalysis(sessionId) {
  const token = getToken();
  
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

// Получение статуса анализа
export async function getAnalysisStatus(sessionId) {
  const token = getToken();
  
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/analysis-status`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to get analysis status");
  }

  return response.json();
}

// Получение результатов анализа
export async function getAnalysisResults(sessionId) {
  const token = getToken();
  
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/analysis-results`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to get analysis results");
  }

  return response.json();
}