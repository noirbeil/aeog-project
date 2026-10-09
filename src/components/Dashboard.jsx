import { useState, useEffect } from "react";
import "./Dashboard.css";
import CreateProject from "./CreateProject";
import ProjectList from "./ProjectList";
import VoiceRecord from "./VoiceRecord";
import AnalysisResults from "./AnalysisResults";
import CompareRecords from "./CompareRecords";
import { getProjectList, getRecentVoiceRecords, getSession } from "../api/sessions_api";
import AdminPsychologists from "./AdminPsychologists";
import AdminPatients from "./AdminPatients";

function Dashboard({ user, onLogout }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activePage, setActivePage] = useState("home");
    const [openProjectId, setOpenProjectId] = useState(null);
    const [openProjectData, setOpenProjectData] = useState(null);
    const [projectAnalysisStatus, setProjectAnalysisStatus] = useState(null);
    const [recentProjects, setRecentProjects] = useState([]);
    const [recentVoiceRecords, setRecentVoiceRecords] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingVoiceRecords, setLoadingVoiceRecords] = useState(false);
    const [pollingInterval, setPollingInterval] = useState(null);

    // Все пункты меню
    const allNavItems = [
        { id: "home", icon: "⌂", label: "Главная" },
        { id: "create", icon: "✓", label: "Создание проекта" },
        { id: "list", icon: "☰", label: "Список проектов" },
        { id: "compare", icon: "♪", label: "Сравнение записей" },
        { id: "admin-psychologists", icon: "👥", label: "Управление психологами", adminOnly: true },
        { id: "patients", icon: "👥", label: "Пациенты" },

    ];

    // Фильтруем пункты меню в зависимости от роли пользователя
    const navItems = allNavItems.filter(item => {
        // Если пункт только для админа и пользователь не админ - скрываем
        if (item.adminOnly && user?.role !== "admin") {
            return false;
        }
        return true;
    });

    // Загрузка данных при открытии главной страницы
    useEffect(() => {
        if (activePage === "home") {
            loadRecentProjects();
            loadRecentVoiceRecords();
        }
    }, [activePage]);

    // Автообновление каждые 30 секунд (для статуса анализа)
    useEffect(() => {
        if (activePage !== "home") return;

        const interval = setInterval(() => {
            loadRecentVoiceRecords();
        }, 30000);

        return () => clearInterval(interval);
    }, [activePage]);

    // Остановка polling при размонтировании
    useEffect(() => {
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [pollingInterval]);

    async function loadRecentProjects() {
        setLoadingProjects(true);
        try {
            const result = await getProjectList({
                page: 1,
                pageSize: 3
            });
            setRecentProjects(result.items || []);
        } catch (error) {
            console.error("Ошибка загрузки проектов:", error);
            setRecentProjects([]);
        } finally {
            setLoadingProjects(false);
        }
    }

    async function loadRecentVoiceRecords() {
        setLoadingVoiceRecords(true);
        try {
            const records = await getRecentVoiceRecords(5);
            setRecentVoiceRecords(records || []);
        } catch (error) {
            console.error("Ошибка загрузки записей голоса:", error);
            setRecentVoiceRecords([]);
        } finally {
            setLoadingVoiceRecords(false);
        }
    }

    // Загрузка данных проекта при открытии
    async function loadProjectData(projectId) {
        try {
            const project = await getSession(projectId);
            console.log("Project data:", project);

            setOpenProjectData(project);

            // ВАЖНО: статус анализа берём из analysis_config
            // В бэкенде SessionWithConfigResponse содержит analysis_config
            let status = "pending";
            if (project.analysis_config) {
                status = project.analysis_config.analysis_status;
            }
            // Если почему-то нет analysis_config, пробуем другие поля
            else if (project.analysis_status) {
                status = project.analysis_status;
            }

            console.log("Analysis status:", status);
            setProjectAnalysisStatus(status);
            return project;
        } catch (error) {
            console.error("Ошибка загрузки проекта:", error);
            setOpenProjectData(null);
            setProjectAnalysisStatus("error");
            return null;
        }
    }

    // Обработчик открытия проекта
    async function handleOpenProject(projectId) {
        setOpenProjectId(projectId);
        await loadProjectData(projectId);
        setActivePage("project");
    }

    function handleBackToList() {
        // Останавливаем polling при выходе
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
        setOpenProjectId(null);
        setOpenProjectData(null);
        setProjectAnalysisStatus(null);
        setActivePage("list");
    }

    // Обработчик завершения записи/загрузки голоса
    function handleVoiceRecordComplete(result) {
        console.log("Voice record completed, result:", result);
        // После загрузки аудио запускаем анализ
        if (openProjectId) {
            // Статус меняется на processing
            setProjectAnalysisStatus("processing");
            // Запускаем периодическую проверку статуса
            startStatusPolling(openProjectId);
        }
    }

    // Обработчик начала анализа (вызывается из VoiceRecord после загрузки)
    function handleAnalysisStart(projectId) {
        console.log("Analysis started for project:", projectId);
        setProjectAnalysisStatus("processing");
        // Запускаем периодическую проверку статуса
        startStatusPolling(projectId);
    }

    // Периодическая проверка статуса анализа
    function startStatusPolling(projectId) {
        // Останавливаем предыдущий polling, если есть
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        const interval = setInterval(async () => {
            try {
                const project = await getSession(projectId);
                let newStatus = "pending";
                if (project.analysis_config) {
                    newStatus = project.analysis_config.analysis_status;
                } else if (project.analysis_status) {
                    newStatus = project.analysis_status;
                }

                console.log("Polling status:", newStatus);
                setProjectAnalysisStatus(newStatus);

                // Если анализ завершён или ошибка, останавливаем polling
                if (newStatus === "completed" || newStatus === "failed") {
                    if (interval) {
                        clearInterval(interval);
                        setPollingInterval(null);
                    }
                }
            } catch (error) {
                console.error("Status check failed:", error);
            }
        }, 5000); // Проверяем каждые 5 секунд

        setPollingInterval(interval);
    }

    function normalizeDate(dateString) {
        if (!dateString) return null;
        if (dateString.includes('T') && !dateString.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateString)) {
            return dateString + 'Z';
        }
        return dateString;
    }

    function formatDate(dateString) {
        if (!dateString) return "Дата не указана";
        const date = new Date(normalizeDate(dateString));
        if (isNaN(date.getTime())) return "Дата не указана";

        const hasTime = dateString.includes('T') || dateString.includes(':');

        if (hasTime) {
            return date.toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } else {
            return date.toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric"
            });
        }
    }

    function formatDuration(seconds) {
        if (!seconds) return "—";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }

    function getAnalysisStatusInfo(status) {
        switch (status) {
            case "completed":
                return { text: "Анализ завершён", className: "status-completed", icon: "✓" };
            case "processing":
                return { text: "Анализируется...", className: "status-processing", icon: "⟳" };
            case "failed":
                return { text: "Ошибка анализа", className: "status-failed", icon: "✕" };
            default:
                return { text: "Ожидает анализа", className: "status-pending", icon: "⏳" };
        }
    }

    function getTimeAgo(dateString) {
        if (!dateString) return "";
        const now = new Date();
        const date = new Date(normalizeDate(dateString));
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) return "только что";
        if (diffMin < 60) return `${diffMin} мин. назад`;

        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `${diffHours} ч. назад`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} дн. назад`;

        return date.toLocaleDateString("ru-RU");
    }

    // Рендер содержимого открытого проекта в зависимости от статуса
    function renderProjectContent() {
        console.log("Rendering project content, status:", projectAnalysisStatus);

        // Если статус не загружен или проект не загружен
        if (!openProjectData && projectAnalysisStatus === null) {
            return <div className="loading-state">Загрузка проекта...</div>;
        }

        // Статус "completed" - показываем результаты анализа
        if (projectAnalysisStatus === "completed") {
            console.log("Showing analysis results");
            return (
                <AnalysisResults
                    sessionId={openProjectId}
                    onBack={handleBackToList}
                />
            );
        }

        // Все остальные статусы (pending, processing, failed) - показываем запись голоса
        console.log("Showing voice record (status:", projectAnalysisStatus, ")");
        return (
            <VoiceRecord
                sessionId={openProjectId}
                onBack={handleBackToList}
                onComplete={handleVoiceRecordComplete}
                onAnalysisStart={handleAnalysisStart}
            />
        );
    }

    return (
        <div className="dash-bg">

            {/* ───── САЙДБАР ───── */}
            <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
                <button
                    className="sidebar-toggle"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    title={sidebarOpen ? "Свернуть" : "Развернуть"}
                >
                    {sidebarOpen ? "◀" : "▶"}
                </button>

                {sidebarOpen && (
                    <div className="sidebar-logo">PSYANALIS</div>
                )}

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            className={`nav-item ${activePage === item.id ? "active" : ""}`}
                            onClick={() => {
                                setActivePage(item.id);
                                setOpenProjectId(null);
                                setOpenProjectData(null);
                                setProjectAnalysisStatus(null);
                                if (pollingInterval) {
                                    clearInterval(pollingInterval);
                                    setPollingInterval(null);
                                }
                            }}
                            title={!sidebarOpen ? item.label : ""}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {sidebarOpen && (
                                <span className="nav-label">{item.label}</span>
                            )}
                        </button>
                    ))}

                    <button
                        className="nav-item"
                        style={{ marginTop: "auto" }}
                        onClick={onLogout}
                        title="Выйти"
                    >
                        <span className="nav-icon">✕</span>
                        {sidebarOpen && <span className="nav-label">Выйти</span>}
                    </button>
                </nav>
            </aside>

            {/* ───── ОСНОВНОЙ КОНТЕНТ ───── */}
            <main className="main-content">

                {activePage === "home" && (
                    <>
                        {/* ── Последние проекты ── */}
                        <section className="section">
                            <h2 className="section-title">Последние проекты</h2>
                            <div className="cards-grid">
                                {loadingProjects ? (
                                    <div className="loading-state">Загрузка проектов...</div>
                                ) : recentProjects.length > 0 ? (
                                    recentProjects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="project-card"
                                            onClick={() => handleOpenProject(project.id)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <div className="project-card-header">
                                                <h3 className="project-card-title">{project.project_name}</h3>
                                                <span className={`project-status ${project.status === "completed" ? "status-completed" : "status-active"}`}>
                                                    {project.status === "completed" ? "Завершён" : "Активен"}
                                                </span>
                                            </div>
                                            <div className="project-card-patient">
                                                <span className="patient-icon"></span>
                                                <span>{project.patient_name} {project.patient_surname}</span>
                                            </div>
                                            <div className="project-card-date">
                                                <span className="date-icon"></span>
                                                <span>{formatDate(project.session_date)}</span>
                                            </div>
                                            {project.last_audio_date && (
                                                <div className="project-card-last-audio">
                                                    <span className="audio-icon"></span>
                                                    <span>Последняя запись: {formatDate(project.last_audio_date)}</span>
                                                </div>
                                            )}
                                            <div className="project-card-analysis">
                                                <span className="analysis-icon"></span>
                                                <span className={getAnalysisStatusInfo(project.analysis_status).className}>
                                                    {getAnalysisStatusInfo(project.analysis_status).text}
                                                </span>
                                            </div>
                                            {project.dominant_emotion && (
                                                <div className="project-card-dominant">
                                                    <span className="emotion-icon"></span>
                                                    <span>Доминирующая эмоция: {project.dominant_emotion}</span>
                                                </div>
                                            )}
                                            <button className="project-card-btn">Открыть проект →</button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <p>Нет созданных проектов</p>
                                        <button
                                            className="create-project-btn"
                                            onClick={() => setActivePage("create")}
                                        >
                                            Создать первый проект
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── Последние записи голоса ── */}
                        <section className="section">
                            <div className="section-header">
                                <h2 className="section-title">Последние записи голоса</h2>
                                <button
                                    className="refresh-btn"
                                    onClick={loadRecentVoiceRecords}
                                    title="Обновить"
                                >
                                    ⟳
                                </button>
                            </div>

                            <div className="voice-records-list">
                                {loadingVoiceRecords ? (
                                    <div className="loading-state">Загрузка записей...</div>
                                ) : recentVoiceRecords.length > 0 ? (
                                    recentVoiceRecords.map((record) => {
                                        const statusInfo = getAnalysisStatusInfo(record.analysis_status);
                                        return (
                                            <div
                                                key={record.id}
                                                className="voice-record-item"
                                                onClick={() => handleOpenProject(record.session_id)}
                                                style={{ cursor: "pointer" }}
                                            >
                                                <div className="voice-record-icon">
                                                    {record.analysis_status === "completed" ? "🎙️" :
                                                        record.analysis_status === "processing" ? "⟳" : "🎤"}
                                                </div>
                                                <div className="voice-record-info">
                                                    <div className="voice-record-header">
                                                        <span className="voice-record-project">
                                                            {record.project_name}
                                                        </span>
                                                        <span className={`voice-record-status ${statusInfo.className}`}>
                                                            {statusInfo.text}
                                                        </span>
                                                    </div>
                                                    <div className="voice-record-details">
                                                        <span className="voice-record-patient">
                                                            👤 {record.patient_name} {record.patient_surname}
                                                        </span>
                                                        {record.duration && (
                                                            <span className="voice-record-duration">
                                                                ⏱ {formatDuration(record.duration)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="voice-record-time">
                                                        <span className="time-ago">
                                                            {getTimeAgo(record.record_date)}
                                                        </span>
                                                        <span className="exact-time">
                                                            {formatDate(record.record_date)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="voice-record-arrow">→</div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="empty-state">
                                        <p>Нет загруженных аудиозаписей</p>
                                        <p className="empty-state-hint">
                                            Создайте проект и загрузите аудио для анализа
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── Уведомления ── */}
                        <section className="section">
                            <h2 className="section-title">Уведомления</h2>
                            <div className="notifications-list">
                                {recentVoiceRecords.filter(r => r.analysis_status === "completed").length > 0 ? (
                                    recentVoiceRecords
                                        .filter(r => r.analysis_status === "completed")
                                        .slice(0, 2)
                                        .map((record) => (
                                            <div
                                                key={`notif-${record.id}`}
                                                className="notification-card"
                                                onClick={() => handleOpenProject(record.session_id)}
                                                style={{ cursor: "pointer" }}
                                            >

                                                <div className="notification-content">
                                                    <p className="notification-text">
                                                        Анализ завершён для проекта «{record.project_name}»
                                                    </p>
                                                    <p className="notification-time">
                                                        {getTimeAgo(record.record_date)}
                                                    </p>
                                                </div>
                                                <button className="notification-btn">Открыть</button>
                                            </div>
                                        ))
                                ) : (
                                    <div className="notification-card">
                                        <div className="notification-icon">📭</div>
                                        <p className="notification-text">Нет новых уведомлений</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {activePage === "create" && <CreateProject />}

                {activePage === "list" && (
                    <ProjectList onOpenProject={handleOpenProject} />
                )}

                {activePage === "project" && renderProjectContent()}

                {activePage === "compare" && <CompareRecords />}

                {activePage === "admin-psychologists" && user?.role === "admin" && <AdminPsychologists />}

                {activePage === "patients" && <AdminPatients user={user} />}


            </main>
        </div>
    );
}

export default Dashboard;