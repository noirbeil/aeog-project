// src/components/RegisterScreen.jsx
import { useState } from "react";
import "./LoginScreen.css"; // используем те же стили
import { registerPsychologist, setToken, getMe } from "../api/auth";

// Правило: пароль минимум 6 символов
const MIN_PASSWORD_LENGTH = 6;

function RegisterScreen({ onRegister, onGoLogin }) {
  // Обязательные поля
  const [name, setName]         = useState("");
  const [surname, setSurname]   = useState("");
  const [login, setLogin]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");

  // Необязательные поля (показываем по кнопке)
  const [showExtra, setShowExtra]         = useState(false);
  const [specialization, setSpec]         = useState("");
  const [licenseNumber, setLicense]       = useState("");

  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  // ------------------------------------
  // Валидация перед отправкой
  // ------------------------------------
  function validate() {
    if (!name.trim())    return "Введите имя";
    if (!surname.trim()) return "Введите фамилию";
    if (!login.trim())   return "Введите логин";
    if (login.trim().length < 3) return "Логин должен быть не короче 3 символов";
    if (password.length < MIN_PASSWORD_LENGTH)
      return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`;
    if (password !== confirm) return "Пароли не совпадают";
    return null; // всё ок
  }

  // ------------------------------------
  // Отправка формы
  // ------------------------------------
  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      // 1. POST /auth/register → получаем токен
      const tokenData = await registerPsychologist({
        name:           name.trim(),
        surname:        surname.trim(),
        login:          login.trim(),
        password,
        specialization: specialization.trim() || null,
        licenseNumber:  licenseNumber.trim()  || null,
      });

      // 2. Сохраняем токен
      setToken(tokenData.access_token);

      // 3. Получаем данные только что созданного пользователя
      const user = await getMe();

      // 4. Передаём наверх — App.jsx переключит экран на Dashboard
      onRegister(user);

    } catch (err) {
      // "Login already registered" приходит с бэкенда
      if (err.message.toLowerCase().includes("already")) {
        setError("Этот логин уже занят. Придумайте другой.");
      } else if (err.message.includes("fetch")) {
        setError("Нет связи с сервером. Убедитесь что бэкенд запущен.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div className="login-bg">
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="login-card" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="card-glow"></div>

        <h1 className="login-title">Регистрация</h1>
        <p className="login-subtitle">Создайте аккаунт психолога</p>

        {/* --- Обязательные поля --- */}
        <input
          className="login-input"
          type="text"
          placeholder="Имя *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <input
          className="login-input"
          type="text"
          placeholder="Фамилия *"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <input
          className="login-input"
          type="text"
          placeholder="Логин *"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoComplete="username"
        />

        <input
          className="login-input"
          type="password"
          placeholder={`Пароль * (мин. ${MIN_PASSWORD_LENGTH} символов)`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoComplete="new-password"
        />

        <input
          className="login-input"
          type="password"
          placeholder="Повторите пароль *"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoComplete="new-password"
        />

        {/* Индикатор совпадения паролей */}
        {confirm && (
          <p style={{
            margin: "-8px 0 0",
            fontSize: 12,
            color: password === confirm ? "#6b8f6b" : "#c0647a",
          }}>
            {password === confirm ? "✓ Пароли совпадают" : "✗ Пароли не совпадают"}
          </p>
        )}

        {/* --- Дополнительные поля (необязательно) --- */}
        <button
          className="extra-toggle"
          onClick={() => setShowExtra((v) => !v)}
          type="button"
        >
          {showExtra ? "▲ Скрыть дополнительные поля" : "▼ Дополнительно (специализация, лицензия)"}
        </button>

        {showExtra && (
          <>
            <input
              className="login-input"
              type="text"
              placeholder="Специализация (необязательно)"
              value={specialization}
              onChange={(e) => setSpec(e.target.value)}
              disabled={loading}
            />
            <input
              className="login-input"
              type="text"
              placeholder="Номер лицензии (необязательно)"
              value={licenseNumber}
              onChange={(e) => setLicense(e.target.value)}
              disabled={loading}
            />
          </>
        )}

        {/* Ошибка */}
        {error && <p className="auth-error">{error}</p>}

        <button
          className="login-button"
          onClick={handleSubmit}
          disabled={loading}
        >
          <span>{loading ? "Регистрируем…" : "Создать аккаунт"}</span>
        </button>

        <p className="auth-switch">
          Уже есть аккаунт?{" "}
          <span onClick={onGoLogin}>Войти</span>
        </p>
      </div>
    </div>
  );
}

export default RegisterScreen;