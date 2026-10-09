// src/components/LoginScreen.jsx
import { useState } from "react";
import "./LoginScreen.css";
import { loginPsychologist, setToken, getMe } from "../api/auth";

function LoginScreen({ onLogin, onGoRegister }) {
  const [login, setLogin]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");      // текст ошибки под формой
  const [loading, setLoading]   = useState(false);  // блокируем кнопку во время запроса

  async function handleSubmit() {
    // Простая валидация на стороне клиента
    if (!login.trim() || !password) {
      setError("Заполните логин и пароль");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // 1. Отправляем логин/пароль на бэкенд → получаем JWT-токен
      const tokenData = await loginPsychologist(login.trim(), password);

      // 2. Сохраняем токен в памяти — он нужен для всех последующих запросов
      setToken(tokenData.access_token);

      // 3. Запрашиваем данные текущего пользователя (имя, роль и т.д.)
      const user = await getMe();

      // 4. Передаём данные наверх в App.jsx
      onLogin(user);

    } catch (err) {
      // Сообщение об ошибке от бэкенда или сетевая ошибка
      if (err.message === "Invalid login or password") {
        setError("Неверный логин или пароль");
      } else if (err.message.includes("fetch")) {
        setError("Нет связи с сервером. Убедитесь что бэкенд запущен.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  // Вход по нажатию Enter
  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div className="login-bg">
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="login-card">
        <div className="card-glow"></div>

        <h1 className="login-title">Авторизация</h1>
        <p className="login-subtitle">Войдите в свой аккаунт</p>

        <input
          className="login-input"
          type="text"
          placeholder="Логин"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoComplete="username"
        />

        <input
          className="login-input"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoComplete="current-password"
        />

        {/* Блок ошибки — появляется только когда есть текст */}
        {error && <p className="auth-error">{error}</p>}

        <button
          className="login-button"
          onClick={handleSubmit}
          disabled={loading}
        >
          <span>{loading ? "Входим…" : "Войти"}</span>
        </button>

        <p className="auth-switch">
          У вас ещё нет аккаунта?{" "}
          <span onClick={onGoRegister}>Зарегистрироваться</span>
        </p>
      </div>
    </div>
  );
}

export default LoginScreen;