// src/components/AdminPsychologists.jsx
import { useState, useEffect } from "react";
import { getAllPsychologists, updatePsychologist, deletePsychologist } from "../api/psychologists";
import "./AdminPsychologists.css";

function AdminPsychologists() {
  const [psychologists, setPsychologists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    surname: "",
    specialization: "",
    license_number: "",
    login: "",
    role: ""
  });
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    loadPsychologists();
  }, []);

  async function loadPsychologists() {
    try {
      setLoading(true);
      const data = await getAllPsychologists();
      setPsychologists(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load psychologists:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick(psychologist) {
    setEditingId(psychologist.id);
    setEditForm({
      name: psychologist.name,
      surname: psychologist.surname,
      specialization: psychologist.specialization || "",
      license_number: psychologist.license_number || "",
      login: psychologist.login,
      role: psychologist.role
    });
    setShowPasswordField(false);
    setPasswordValue("");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditForm({
      name: "",
      surname: "",
      specialization: "",
      license_number: "",
      login: "",
      role: ""
    });
    setShowPasswordField(false);
    setPasswordValue("");
  }

  async function handleSaveEdit(id) {
    try {
      const updateData = {
        name: editForm.name,
        surname: editForm.surname,
        specialization: editForm.specialization || null,
        license_number: editForm.license_number || null,
        login: editForm.login,
        role: editForm.role
      };

      // Если пароль был введён - добавляем
      if (showPasswordField && passwordValue.trim()) {
        updateData.password = passwordValue;
      }

      const updated = await updatePsychologist(id, updateData);
      
      // Обновляем список
      setPsychologists(psychologists.map(p => 
        p.id === id ? updated : p
      ));
      
      setEditingId(null);
      setShowPasswordField(false);
      setPasswordValue("");
    } catch (err) {
      setError(err.message);
      console.error("Failed to update psychologist:", err);
    }
  }

  async function handleDelete(id, name, surname) {
    if (window.confirm(`Вы уверены, что хотите удалить психолога ${name} ${surname}?`)) {
      try {
        await deletePsychologist(id);
        setPsychologists(psychologists.filter(p => p.id !== id));
      } catch (err) {
        setError(err.message);
        console.error("Failed to delete psychologist:", err);
      }
    }
  }

  // Фильтрация психологов
  const filteredPsychologists = psychologists.filter(p => {
    const matchesSearch = 
      `${p.name} ${p.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.login.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || p.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="admin-psychologists">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка списка психологов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-psychologists">
      <div className="admin-header">
        <h1>👥 Управление психологами</h1>
        <p className="admin-subtitle">Просмотр, редактирование и удаление учетных записей психологов</p>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Поиск по имени, фамилии или логину..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="role-filter">
          <label>Роль:</label>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Все</option>
            <option value="psychologist">Психологи</option>
            <option value="admin">Администраторы</option>
          </select>
        </div>

        <button className="refresh-btn" onClick={loadPsychologists} title="Обновить">
          ⟳ 
        </button>
      </div>

      <div className="psychologists-table-container">
        <table className="psychologists-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>ФИО</th>
              <th>Логин</th>
              <th>Специализация</th>
              <th>Номер лицензии</th>
              <th>Роль</th>
              <th>Дата регистрации</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredPsychologists.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-row">
                  {searchTerm || roleFilter !== "all" 
                    ? "Психологи не найдены по заданным фильтрам"
                    : "Список психологов пуст"}
                </td>
              </tr>
            ) : (
              filteredPsychologists.map((psychologist) => (
                <tr key={psychologist.id} className={editingId === psychologist.id ? "editing-row" : ""}>
                  {editingId === psychologist.id ? (
                    // Режим редактирования
                    <>
                      <td>{psychologist.id}</td>
                      <td>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          placeholder="Имя"
                          className="edit-input"
                        />
                        <input
                          type="text"
                          value={editForm.surname}
                          onChange={(e) => setEditForm({...editForm, surname: e.target.value})}
                          placeholder="Фамилия"
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editForm.login}
                          onChange={(e) => setEditForm({...editForm, login: e.target.value})}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editForm.specialization}
                          onChange={(e) => setEditForm({...editForm, specialization: e.target.value})}
                          className="edit-input"
                          placeholder="Специализация"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editForm.license_number}
                          onChange={(e) => setEditForm({...editForm, license_number: e.target.value})}
                          className="edit-input"
                          placeholder="Номер лицензии"
                        />
                      </td>
                      <td>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                          className="edit-select"
                        >
                          <option value="psychologist">Психолог</option>
                          <option value="admin">Администратор</option>
                        </select>
                      </td>
                      <td>
                        <button 
                          className="password-toggle-btn"
                          onClick={() => setShowPasswordField(!showPasswordField)}
                        >
                          {showPasswordField ? "🔒 Скрыть" : "🔓 Сменить пароль"}
                        </button>
                        {showPasswordField && (
                          <input
                            type="password"
                            value={passwordValue}
                            onChange={(e) => setPasswordValue(e.target.value)}
                            placeholder="Новый пароль"
                            className="edit-input password-input"
                          />
                        )}
                      </td>
                      <td>
                        <button 
                          className="save-btn"
                          onClick={() => handleSaveEdit(psychologist.id)}
                        >
                          💾 Сохранить
                        </button>
                        <button 
                          className="cancel-btn"
                          onClick={handleCancelEdit}
                        >
                          ✕ Отмена
                        </button>
                      </td>
                    </>
                  ) : (
                    // Обычный режим просмотра
                    <>
                      <td>{psychologist.id}</td>
                      <td>
                        <strong>{psychologist.surname} {psychologist.name}</strong>
                      </td>
                      <td>{psychologist.login}</td>
                      <td>{psychologist.specialization || "—"}</td>
                      <td>{psychologist.license_number || "—"}</td>
                      <td>
                        <span className={`role-badge role-${psychologist.role}`}>
                          {psychologist.role === "admin" ? "👑 Админ" : "💼 Психолог"}
                        </span>
                      </td>
                      <td>{new Date(psychologist.created_at).toLocaleDateString("ru-RU")}</td>
                      <td className="actions-cell">
                        <button 
                          className="edit-btn"
                          onClick={() => handleEditClick(psychologist)}
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDelete(psychologist.id, psychologist.name, psychologist.surname)}
                          title="Удалить"
                          disabled={psychologist.role === "admin"}
                        >
                          🗑️
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="stats-footer">
        <div className="stats-info">
          Всего: <strong>{psychologists.length}</strong> пользователей
          (психологов: <strong>{psychologists.filter(p => p.role === "psychologist").length}</strong>, 
          администраторов: <strong>{psychologists.filter(p => p.role === "admin").length}</strong>)
        </div>
        <div className="help-text">
          ℹ️ Администраторов с ролью "admin" нельзя удалить (кроме себя), чтобы сохранить доступ к системе.
        </div>
      </div>
    </div>
  );
}

export default AdminPsychologists;