// src/components/AdminPatients.jsx
import { useState, useEffect } from "react";
import { getPatients, createPatient, updatePatient, deletePatient } from "../api/patients";
import "./AdminPatients.css";

function AdminPatients({ user }) {  // Добавляем user как пропс
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [editForm, setEditForm] = useState({
    name: "",
    surname: "",
    birth_date: "",
    gender: "male",
    status: "active",
    medical_history: ""
  });

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load patients:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateClick() {
    if (user?.role !== "admin") {
      setError("Только администраторы могут добавлять пациентов");
      return;
    }
    setShowCreateForm(true);
    setEditingId(null);
    setEditForm({
      name: "",
      surname: "",
      birth_date: "",
      gender: "male",
      status: "active",
      medical_history: ""
    });
  }

  function handleEditClick(patient) {
    if (user?.role !== "admin") {
      setError("Только администраторы могут редактировать пациентов");
      return;
    }
    setEditingId(patient.id);
    setShowCreateForm(false);
    setEditForm({
      name: patient.name,
      surname: patient.surname,
      birth_date: patient.birth_date ? patient.birth_date.split('T')[0] : "",
      gender: patient.gender || "male",
      status: patient.status || "active",
      medical_history: patient.medical_history || ""
    });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setShowCreateForm(false);
    setEditForm({
      name: "",
      surname: "",
      birth_date: "",
      gender: "male",
      status: "active",
      medical_history: ""
    });
  }

  async function handleCreate() {
    if (!editForm.name || !editForm.surname) {
      setError("Имя и фамилия обязательны для заполнения");
      return;
    }

    try {
      const newPatient = await createPatient({
        name: editForm.name,
        surname: editForm.surname,
        birth_date: editForm.birth_date || null,
        gender: editForm.gender,
        medical_history: editForm.medical_history || null
      });
      
      setPatients([newPatient, ...patients]);
      handleCancelEdit();
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to create patient:", err);
    }
  }

  async function handleSaveEdit(id) {
    if (!editForm.name || !editForm.surname) {
      setError("Имя и фамилия обязательны для заполнения");
      return;
    }

    try {
      const updateData = {
        name: editForm.name,
        surname: editForm.surname,
        birth_date: editForm.birth_date || null,
        gender: editForm.gender,
        status: editForm.status,
        medical_history: editForm.medical_history || null
      };

      const updated = await updatePatient(id, updateData);
      
      setPatients(patients.map(p => p.id === id ? updated : p));
      handleCancelEdit();
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to update patient:", err);
    }
  }

  async function handleDelete(id, name, surname) {
    if (user?.role !== "admin") {
      setError("Только администраторы могут удалять пациентов");
      return;
    }

    // Проверяем, есть ли у пациента сессии
    const patientSessions = patients.find(p => p.id === id)?.sessions_count || 0;
    
    let confirmMessage = `Вы уверены, что хотите удалить пациента "${name} ${surname}"?`;
    if (patientSessions > 0) {
      confirmMessage += `\n\n⚠️ ВНИМАНИЕ: У этого пациента есть ${patientSessions} сессий. При удалении пациента все связанные сессии, аудиозаписи и отчеты будут также удалены!\n\nЭто действие необратимо!`;
    } else {
      confirmMessage += `\n\nЭто действие необратимо!`;
    }
    
    if (window.confirm(confirmMessage)) {
      try {
        await deletePatient(id);
        setPatients(patients.filter(p => p.id !== id));
        setError(null);
      } catch (err) {
        let errorMessage = err.message;
        if (err.message.includes("sessions")) {
          errorMessage = "Невозможно удалить пациента с существующими сессиями. Сначала удалите все сессии пациента.";
        }
        setError(errorMessage);
        console.error("Failed to delete patient:", err);
      }
    }
  }

  // Фильтрация пациентов
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      `${patient.name} ${patient.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.surname.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || patient.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  function formatDate(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("ru-RU");
  }

  function formatFullDate(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function getGenderLabel(gender) {
    switch (gender) {
      case "male": return "Мужской";
      case "female": return "Женский";
      default: return "Не указан";
    }
  }

  function getGenderIcon(gender) {
    switch (gender) {
      case "male": return "";
      case "female": return "";
      default: return "";
    }
  }

  function getAgeWord(age) {
    const lastDigit = age % 10;
    const lastTwoDigits = age % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "лет";
    if (lastDigit === 1) return "год";
    if (lastDigit >= 2 && lastDigit <= 4) return "года";
    return "лет";
  }

  if (loading) {
    return (
      <div className="admin-patients">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка списка пациентов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-patients">
      <div className="admin-header">
        <div className="header-left">
          <h1>Управление пациентами</h1>
          <p className="admin-subtitle">
            Просмотр, добавление, редактирование и удаление пациентов
            {user?.role !== "admin" && " (только просмотр)"}
          </p>
        </div>
        {user?.role === "admin" && (
          <button className="create-btn" onClick={handleCreateClick}>
            Добавить пациента
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Форма создания нового пациента - только для админа */}
      {showCreateForm && user?.role === "admin" && (
        <div className="form-modal">
          <div className="form-container">
            <div className="form-header">
              <h2>➕ Добавление нового пациента</h2>
              <button className="close-btn" onClick={handleCancelEdit}>✕</button>
            </div>
            <div className="form-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Имя *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder="Введите имя"
                  />
                </div>
                <div className="form-group">
                  <label>Фамилия *</label>
                  <input
                    type="text"
                    value={editForm.surname}
                    onChange={(e) => setEditForm({...editForm, surname: e.target.value})}
                    placeholder="Введите фамилию"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Дата рождения</label>
                  <input
                    type="date"
                    value={editForm.birth_date}
                    onChange={(e) => setEditForm({...editForm, birth_date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Пол</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                  >
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                    <option value="other">Другой</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>История болезни</label>
                <textarea
                  value={editForm.medical_history}
                  onChange={(e) => setEditForm({...editForm, medical_history: e.target.value})}
                  placeholder="Введите историю болезни..."
                  rows="4"
                />
              </div>
            </div>
            <div className="form-footer">
              <button className="cancel-form-btn" onClick={handleCancelEdit}>Отмена</button>
              <button className="save-form-btn" onClick={handleCreate}>Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* Форма редактирования - только для админа */}
      {editingId !== null && user?.role === "admin" && (
        <div className="form-modal">
          <div className="form-container">
            <div className="form-header">
              <h2>✏️ Редактирование пациента</h2>
              <button className="close-btn" onClick={handleCancelEdit}>✕</button>
            </div>
            <div className="form-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Имя *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Фамилия *</label>
                  <input
                    type="text"
                    value={editForm.surname}
                    onChange={(e) => setEditForm({...editForm, surname: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Дата рождения</label>
                  <input
                    type="date"
                    value={editForm.birth_date}
                    onChange={(e) => setEditForm({...editForm, birth_date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Пол</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                  >
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                    <option value="other">Другой</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Статус</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  >
                    <option value="active">Активный</option>
                    <option value="archived">Архивный</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>История болезни</label>
                <textarea
                  value={editForm.medical_history}
                  onChange={(e) => setEditForm({...editForm, medical_history: e.target.value})}
                  rows="4"
                />
              </div>
            </div>
            <div className="form-footer">
              <button className="cancel-form-btn" onClick={handleCancelEdit}>Отмена</button>
              <button className="save-form-btn" onClick={() => handleSaveEdit(editingId)}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Поиск по имени или фамилии..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="status-filter">
          <label>Статус:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Все</option>
            <option value="active">Активные</option>
            <option value="archived">Архивные</option>
          </select>
        </div>

        <button className="refresh-btn" onClick={loadPatients} title="Обновить">
          ⟳ 
        </button>
      </div>

      {/* Статистика */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{patients.length}</div>
          <div className="stat-label">Всего пациентов</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{patients.filter(p => p.status === "active").length}</div>
          <div className="stat-label">Активных</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{patients.filter(p => p.status === "archived").length}</div>
          <div className="stat-label">Архивных</div>
        </div>
      </div>

      {/* Таблица пациентов */}
      <div className="patients-table-container">
        <table className="patients-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>ФИО</th>
              <th>Пол</th>
              <th>Дата рождения</th>
              <th>Возраст</th>
              <th>Статус</th>
              <th>Дата создания</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-row">
                  {searchTerm || statusFilter !== "all" 
                    ? "Пациенты не найдены по заданным фильтрам"
                    : "Список пациентов пуст. Добавьте первого пациента!"}
                 </td>
               </tr>
            ) : (
              filteredPatients.map((patient) => {
                let age = "—";
                if (patient.birth_date) {
                  const birthDate = new Date(patient.birth_date);
                  const today = new Date();
                  let ageNum = today.getFullYear() - birthDate.getFullYear();
                  const monthDiff = today.getMonth() - birthDate.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    ageNum--;
                  }
                  age = `${ageNum} ${getAgeWord(ageNum)}`;
                }

                return (
                  <tr key={patient.id} className={patient.status === "archived" ? "archived-row" : ""}>
                    <td>{patient.id}</td>
                    <td className="patient-name-cell">
                      <strong>{patient.surname} {patient.name}</strong>
                      {patient.medical_history && (
                        <div className="medical-history-preview">
                          {patient.medical_history.substring(0, 50)}
                          {patient.medical_history.length > 50 && "..."}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="gender-badge">
                        {getGenderIcon(patient.gender)} {getGenderLabel(patient.gender)}
                      </span>
                    </td>
                    <td>{formatFullDate(patient.birth_date)}</td>
                    <td>{age}</td>
                    <td>
                      <span className={`status-badge status-${patient.status}`}>
                        {patient.status === "active" ? "Активен" : " Архив"}
                      </span>
                    </td>
                    <td>{formatDate(patient.created_at)}</td>
                    <td className="actions-cell">
                      {user?.role === "admin" ? (
                        <>
                          <button 
                            className="edit-btn"
                            onClick={() => handleEditClick(patient)}
                            title="Редактировать"
                          >
                          ✏️
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDelete(patient.id, patient.name, patient.surname)}
                            title="Удалить"
                          >
                          🗑️
                          </button>
                        </>
                      ) : (
                        <span className="view-only">Только просмотр</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="info-footer">
        <div className="help-text">
          💡 <strong>Информация:</strong> 
          {user?.role === "admin" 
            ? " При удалении пациента все связанные с ним сессии, аудиозаписи и отчеты будут автоматически удалены."
            : " Для добавления, редактирования и удаления пациентов необходимы права администратора."}
        </div>
      </div>
    </div>
  );
}

export default AdminPatients;