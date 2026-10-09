// src/api/psychologists.js
import { getToken } from "./auth";

const BASE_URL = "http://192.168.1.162:8000";

// Получить всех психологов
export async function getAllPsychologists() {
  const token = getToken();
  
  const response = await fetch(`${BASE_URL}/admin/psychologists/`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch psychologists");
  }

  return response.json();
}

// Получить психолога по ID
export async function getPsychologist(id) {
  const token = getToken();
  
  const response = await fetch(`${BASE_URL}/admin/psychologists/${id}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch psychologist");
  }

  return response.json();
}

// Обновить психолога
export async function updatePsychologist(id, data) {
  const token = getToken();
  
  const response = await fetch(`${BASE_URL}/admin/psychologists/${id}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update psychologist");
  }

  return response.json();
}

// Удалить психолога
export async function deletePsychologist(id) {
  const token = getToken();
  
  const response = await fetch(`${BASE_URL}/admin/psychologists/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete psychologist");
  }

  return response.json();
}