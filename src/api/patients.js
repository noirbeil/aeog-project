// src/api/patients.js
import { getToken } from "./auth";

const BASE_URL = "http://192.168.1.162:8000";

// Получить всех пациентов
export async function getPatients(skip = 0, limit = 1000) {
  const token = getToken();
  
  const response = await fetch(`${BASE_URL}/patients/?skip=${skip}&limit=${limit}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch patients");
  }

  return response.json();
}

// Создать пациента
export async function createPatient(patientData) {
  const token = getToken();
  
  const response = await fetch(`${BASE_URL}/patients/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(patientData),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.detail || "Failed to create patient");
  }

  return json;
}

// Обновить пациента
export async function updatePatient(id, patientData) {
  const token = getToken();
  
  const response = await fetch(`${BASE_URL}/patients/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(patientData),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.detail || "Failed to update patient");
  }

  return json;
}

// Удалить пациента
export async function deletePatient(id) {
  const token = getToken();
  
  const response = await fetch(`${BASE_URL}/patients/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete patient");
  }

  return response.json();
}

// Поиск пациентов (клиентская фильтрация)
export async function searchPatients(query) {
  const token = getToken();
  
  const response = await fetch(`${BASE_URL}/patients/?skip=0&limit=1000`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to search patients");
  }

  const patients = await response.json();
  
  if (query) {
    return patients.filter(p => 
      `${p.name} ${p.surname}`.toLowerCase().includes(query.toLowerCase()) ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.surname.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  return patients;
}