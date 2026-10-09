// src/components/ProjectList.jsx
import { useState, useEffect, useCallback } from "react";
import { getProjectList } from "../api/sessions_api";
import "./ProjectList.css";

// Русские названия статусов анализа
const ANALYSIS_STATUS = {
  pending:    { label: "Ожидает",   color: "#b0a0c8" },
  processing: { label: "Анализ...", color: "#f0a020" },
  completed:  { label: "Готово",    color: "#5a9e6f" },
  failed:     { label: "Ошибка",    color: "#c05060" },
};

// Русские названия эмоций
const EMOTION_RU = {
  joy:     "Радость",
  sadness: "Грусть",
  anger:   "Гнев",
  fear:    "Страх",
  disgust: "Отвращение",
  neutral: "Нейтральное",
};

// Форматирует дату "2025-03-10" → "10.03.2025"
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("ru-RU");
}

const PAGE_SIZE = 8;

function ProjectList({ onOpenProject }) {
  // ── Данные ──────────────────────────────────────────────────
  const [projects, setProjects]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // ── Фильтры ─────────────────────────────────────────────────
  const [search, setSearch]       = useState("");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [page, setPage]           = useState(1);

  // ── Загрузка данных ─────────────────────────────────────────
  const load = useCallback(async (currentPage = 1) => {
    setLoading(true);
    setError("");
    try {
      const data = await getProjectList({
        search:   search.trim(),
        dateFrom: dateFrom || null,
        dateTo:   dateTo   || null,
        page:     currentPage,
        pageSize: PAGE_SIZE,
      });
      setProjects(data.items);
      setTotal(data.total);
      setPages(data.pages);
      setPage(currentPage);
    } catch (e) {
      setError(e.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo]);

  // Загружаем при первом открытии
  useEffect(() => { load(1); }, []);   // eslint-disable-line

  // ── Поиск ───────────────────────────────────────────────────
  function handleSearch() {
    load(1);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSearch();
  }

  // ── Пагинация ────────────────────────────────────────────────
  function goTo(p) {
    if (p < 1 || p > pages) return;
    load(p);
  }

  // Генерируем номера страниц вокруг текущей (максимум 5)
  function pageNumbers() {
    const nums = [];
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, start + 4);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }

  // ── Рендер ──────────────────────────────────────────────────
  return (
    <div className="pl-container">

      {/* ── Поиск ── */}
      <div className="pl-search">
        <input
          type="text"
          placeholder="ФИО пациента"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          type="date"
          placeholder="Дата от"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          title="Начало диапазона дат"
        />
        <input
          type="date"
          placeholder="Дата до"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          title="Конец диапазона дат"
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? "..." : "Найти"}
        </button>
      </div>

      {/* ── Ошибка ── */}
      {error && <p className="pl-error">{error}</p>}

      {/* ── Счётчик результатов ── */}
      {!loading && !error && (
        <p className="pl-count">
          {total === 0
            ? "Проектов не найдено"
            : `Найдено проектов: ${total}`}
        </p>
      )}

      {/* ── Карточки ── */}
      {loading ? (
        <div className="pl-loading">Загрузка...</div>
      ) : (
        <div className="pl-grid">
          {projects.map(project => {
            const statusInfo = ANALYSIS_STATUS[project.analysis_status] || ANALYSIS_STATUS.pending;

            return (
              <div
                key={project.id}
                className="pl-card"
                onClick={() => onOpenProject && onOpenProject(project.id)}
                title="Открыть проект"
              >
                {/* Имя пациента */}
                <p className="pl-card-name">
                  {project.patient_surname} {project.patient_name}
                </p>

                {/* Название проекта */}
                <p className="pl-card-project">{project.project_name}</p>

                {/* Дата сессии */}
                <p className="pl-card-meta">
                  Дата проекта: <strong>{formatDate(project.session_date)}</strong>
                </p>

                {/* Дата последней записи */}
                <p className="pl-card-meta">
                  Последняя запись:{" "}
                  <strong>{formatDate(project.last_audio_date)}</strong>
                </p>

                {/* Статус анализа */}
                <div className="pl-card-footer">
                  <span
                    className="pl-status-badge"
                    style={{ backgroundColor: statusInfo.color }}
                  >
                    {statusInfo.label}
                  </span>

                  {/* Доминирующая эмоция (если анализ завершён) */}
                  {project.dominant_emotion && (
                    <span className="pl-emotion-badge">
                      {EMOTION_RU[project.dominant_emotion] ?? project.dominant_emotion}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Пагинация ── */}
      {pages > 1 && (
        <div className="pl-pagination">
          <span
            className={page === 1 ? "pl-pg-arrow disabled" : "pl-pg-arrow"}
            onClick={() => goTo(page - 1)}
          >
            {"<"}
          </span>

          {pageNumbers().map(n => (
            <button
              key={n}
              className={n === page ? "active" : ""}
              onClick={() => goTo(n)}
            >
              {n}
            </button>
          ))}

          <span
            className={page === pages ? "pl-pg-arrow disabled" : "pl-pg-arrow"}
            onClick={() => goTo(page + 1)}
          >
            {">"}
          </span>
        </div>
      )}

    </div>
  );
}

export default ProjectList;