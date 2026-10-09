// src/App.jsx
import { useState } from "react";
import LoginScreen    from "./components/LoginScreen";
import RegisterScreen from "./components/RegisterScreen";
import Dashboard      from "./components/Dashboard";
import { clearToken } from "./api/auth";

function App() {
  const [screen, setScreen] = useState("login"); // "login" | "register" | "dashboard"
  const [user, setUser]     = useState(null);
  // user после логина/регистрации:
  // { id, name, surname, login, role, created_at }

  function handleLogin(userData) {
    setUser(userData);
    setScreen("dashboard");
  }

  function handleRegister(userData) {
    setUser(userData);
    setScreen("dashboard");
  }

  function handleLogout() {
    clearToken();   // удаляем JWT из памяти
    setUser(null);
    setScreen("login");
  }

  if (screen === "register") {
    return (
      <RegisterScreen
        onRegister={handleRegister}
        onGoLogin={() => setScreen("login")}
      />
    );
  }

  if (screen === "dashboard") {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  // screen === "login"
  return (
    <LoginScreen
      onLogin={handleLogin}
      onGoRegister={() => setScreen("register")}
    />
  );
}

export default App;