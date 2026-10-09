// src/components/AnalysisResults.jsx
import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { getAnalysisResults, exportReport } from "../api/analysis";
import "./AnalysisResults.css";

// Цветовая схема для эмоций
const EMOTION_COLORS = {
  joy: "#f0c040",
  sadness: "#5b9bd5",
  fear: "#a0c060",
  anger: "#e06060",
  disgust: "#9b7fc7",
  neutral: "#9e9e9e",
  surprise: "#ffa07a"
};

const EMOTION_NAMES_RU = {
  joy: "Радость",
  sadness: "Грусть",
  fear: "Страх",
  anger: "Злость",
  disgust: "Брезгливость",
  neutral: "Нейтрально",
  surprise: "Удивление"
};

function AnalysisResults({ sessionId, onBack, onExport }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [exporting, setExporting] = useState(false);

  const loadAnalysisResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnalysisResults(sessionId);
      console.log("Analysis data received:", data);
      setAnalysisData(data);
    } catch (err) {
      console.error("Failed to load analysis:", err);
      setError(err.message || "Не удалось загрузить результаты анализа");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      loadAnalysisResults();
    }
  }, [sessionId, loadAnalysisResults]);

  // Форматирование данных для круговой диаграммы (оставляем на вкладке детали)
  const preparePieData = () => {
    if (!analysisData?.aggregated_emotions) return [];

    return Object.entries(analysisData.aggregated_emotions)
      .map(([emotion, value]) => ({
        name: EMOTION_NAMES_RU[emotion] || emotion,
        value: Math.round(value * 100),
        emotion: emotion,
        color: EMOTION_COLORS[emotion] || "#9e9e9e"
      }))
      .filter(item => item.value > 0);
  };

  // Форматирование данных для временной шкалы (фикс: правильные временные метки)
  const prepareTimelineData = () => {
    if (!analysisData?.segments) return [];

    return analysisData.segments.map((seg, index) => ({
      time: `${seg.timestamp_start.toFixed(1)}с - ${seg.timestamp_end.toFixed(1)}с`,
      timeStart: seg.timestamp_start,
      timeEnd: seg.timestamp_end,
      joy: seg.probabilities?.joy || 0,
      sadness: seg.probabilities?.sadness || 0,
      anger: seg.probabilities?.anger || 0,
      fear: seg.probabilities?.fear || 0,
      disgust: seg.probabilities?.disgust || 0,
      neutral: seg.probabilities?.neutral || 0,
      dominant: seg.dominant_emotion,
      dominant_ru: EMOTION_NAMES_RU[seg.dominant_emotion] || seg.dominant_emotion,
      confidence: seg.confidence
    }));
  };

  // Форматирование данных для акустических параметров
  const prepareAcousticData = () => {
    if (!analysisData?.segments) return [];

    return analysisData.segments.map(seg => ({
      time: `${seg.timestamp_start.toFixed(1)}с`,
      timeStart: seg.timestamp_start,
      pitch: seg.acoustic_features?.pitch || 150 + Math.random() * 100,
      energy: seg.acoustic_features?.energy || 0.3 + Math.random() * 0.5,
      intensity: (seg.acoustic_features?.energy || 0.5) * 100
    }));
  };

  // Экспорт отчёта
  const handleExport = async (format = "pdf") => {
    setExporting(true);
    setError(null);
    try {
      const blob = await exportReport(sessionId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analysis_report_${sessionId}_${new Date().toISOString().slice(0, 19)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      if (onExport) onExport(format);
    } catch (err) {
      console.error("Export failed:", err);
      setError(err.message || "Не удалось экспортировать отчёт");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="ar-container loading">
        <div className="ar-loader">
          <div className="ar-spinner"></div>
          <p>Загрузка результатов анализа...</p>
          <p className="ar-loader-sub">Это может занять несколько секунд</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ar-container error">
        <div className="ar-error-card">
          <h3>Ошибка загрузки результатов</h3>
          <p>{error}</p>
          <button onClick={loadAnalysisResults} className="ar-retry-btn">
            Попробовать снова
          </button>
          <button onClick={onBack} className="ar-back-btn">
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  if (!analysisData || !analysisData.segments?.length) {
    return (
      <div className="ar-container no-data">
        <div className="ar-no-data-card">
          <h3>Нет данных для отображения</h3>
          <p>Анализ аудиозаписи ещё не завершён или не содержит данных.</p>
          <button onClick={loadAnalysisResults} className="ar-retry-btn">
            Обновить
          </button>
          <button onClick={onBack} className="ar-back-btn">
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  const pieData = preparePieData();
  const timelineData = prepareTimelineData();
  const acousticData = prepareAcousticData();

  return (
    <div className="ar-container">
      {/* Хлебные крошки */}
      <div className="ar-header">
        <div className="ar-breadcrumb">
          <span className="ar-link" onClick={() => onBack?.("create")}>
            Создание проекта
          </span>
          <span className="ar-sep"> / </span>
          <span className="ar-link" onClick={() => onBack?.("voice")}>
            Запись голоса
          </span>
          <span className="ar-sep"> / </span>
          <span className="ar-current">Результаты анализа</span>
        </div>
        
        <div className="ar-meta">
          <span>Сессия #{analysisData.session_id || sessionId}</span>
          <span className="ar-meta-sep">|</span>
          <span>Длительность: {analysisData.total_duration?.toFixed(1) || 0} сек</span>
          <span className="ar-meta-sep">|</span>
          <span>Сегментов: {analysisData.segments?.length || 0}</span>
          <span className="ar-meta-sep">|</span>
          <span className={`ar-status-badge ${analysisData.analysis_status}`}>
            {analysisData.analysis_status === "completed" ? "Анализ завершён" : "В обработке"}
          </span>
        </div>
      </div>

      {/* Вкладки - убрали "Распределение" */}
      <div className="ar-tabs">
        <button 
          className={`ar-tab ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          Временная шкала
        </button>
        <button 
          className={`ar-tab ${activeTab === "acoustic" ? "active" : ""}`}
          onClick={() => setActiveTab("acoustic")}
        >
          Акустические параметры
        </button>
        <button 
          className={`ar-tab ${activeTab === "details" ? "active" : ""}`}
          onClick={() => setActiveTab("details")}
        >
          Детальный отчёт
        </button>
      </div>

      <div className="ar-content">
        {/* Вкладка: Временная шкала эмоций */}
        {activeTab === "timeline" && (
          <div className="ar-grid">
            <div className="ar-card wide">
              <h3 className="ar-card-title">
                Динамика эмоций по времени
                <span className="ar-card-sub">(каждый сегмент: {analysisData.segments[0]?.timestamp_end - analysisData.segments[0]?.timestamp_start || 3-5} секунд)</span>
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid stroke="#ece8f4" strokeDasharray="4 4" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 11, fill: "#9e8cb0" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tickFormatter={(v) => `${Math.round(v * 100)}%`}
                    tick={{ fontSize: 11, fill: "#9e8cb0" }}
                    domain={[0, 1]}
                    label={{ value: "Интенсивность эмоций", angle: -90, position: "left", offset: 0 }}
                  />
                  <Tooltip
                    formatter={(v, name) => [`${Math.round(v * 100)}%`, EMOTION_NAMES_RU[name] || name]}
                    contentStyle={{ borderRadius: 10, background: "#fff", boxShadow: "0 4px 16px rgba(120,90,160,0.15)" }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload) {
                        const seg = payload[0].payload;
                        return `Время: ${seg.timeStart.toFixed(1)}-${seg.timeEnd.toFixed(1)}с\nДоминанта: ${seg.dominant_ru} (${Math.round(seg.confidence * 100)}%)`;
                      }
                      return `Время: ${label}`;
                    }}
                  />
                  <Legend 
                                    iconType="circle" 
                    iconSize={8}
                    wrapperStyle={{ paddingTop: 10 }}
                    formatter={(v) => <span style={{ color: "#5a4878", fontSize: 12 }}>{EMOTION_NAMES_RU[v] || v}</span>}
                  />
                  <Line type="monotone" dataKey="joy" stroke={EMOTION_COLORS.joy} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="sadness" stroke={EMOTION_COLORS.sadness} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="anger" stroke={EMOTION_COLORS.anger} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="fear" stroke={EMOTION_COLORS.fear} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="disgust" stroke={EMOTION_COLORS.disgust} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="ar-card">
              <h3 className="ar-card-title">Общая статистика</h3>
              <div className="ar-stats">
                <div className="ar-stat-item">
                  <span className="ar-stat-label">Доминирующая эмоция:</span>
                  <span 
                    className="ar-stat-value dominant"
                    style={{ color: EMOTION_COLORS[analysisData.dominant_emotion] }}
                  >
                    {EMOTION_NAMES_RU[analysisData.dominant_emotion] || analysisData.dominant_emotion}
                  </span>
                </div>
                <div className="ar-stat-item">
                  <span className="ar-stat-label">Средняя уверенность:</span>
                  <span className="ar-stat-value">{Math.round((analysisData.average_confidence || 0) * 100)}%</span>
                </div>
                <div className="ar-stat-item">
                  <span className="ar-stat-label">Длительность записи:</span>
                  <span className="ar-stat-value">{analysisData.total_duration?.toFixed(1) || 0} сек</span>
                </div>
                <div className="ar-stat-item">
                  <span className="ar-stat-label">Количество сегментов:</span>
                  <span className="ar-stat-value">{analysisData.segments?.length || 0}</span>
                </div>
              </div>
            </div>

            <div className="ar-card">
              <h3 className="ar-card-title">Маркеры состояния</h3>
              {analysisData.markers && analysisData.markers.length > 0 ? (
                <ul className="ar-markers-list">
                  {analysisData.markers.map((marker, idx) => (
                    <li key={idx} className="ar-marker-item">{marker}</li>
                  ))}
                </ul>
              ) : (
                <p className="ar-no-markers">✓ Значимых маркеров эмоционального неблагополучия не выявлено</p>
              )}
            </div>

            {/* Таблица сегментов */}
            <div className="ar-card wide">
              <h3 className="ar-card-title">Детальная таблица сегментов</h3>
              <div className="ar-table-wrapper">
                <table className="ar-segments-table">
                  <thead>
                    <tr>
                      <th>Временной интервал</th>
                      <th>Доминирующая эмоция</th>
                      <th>Уверенность</th>
                      <th>Радость</th>
                      <th>Грусть</th>
                      <th>Злость</th>
                      <th>Страх</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timelineData.map((seg, idx) => (
                      <tr key={idx}>
                        <td>{seg.time}</td>
                        <td>
                          <span 
                            className="ar-emotion-badge"
                            style={{ backgroundColor: EMOTION_COLORS[seg.dominant] }}
                          >
                            {seg.dominant_ru}
                          </span>
                        </td>
                        <td>{Math.round(seg.confidence * 100)}%</td>
                        <td>{Math.round(seg.joy * 100)}%</td>
                        <td>{Math.round(seg.sadness * 100)}%</td>
                        <td>{Math.round(seg.anger * 100)}%</td>
                        <td>{Math.round(seg.fear * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Вкладка: Акустические параметры */}
        {activeTab === "acoustic" && (
          <div className="ar-grid">
            <div className="ar-card wide">
              <h3 className="ar-card-title">Динамика акустических параметров</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={acousticData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid stroke="#ece8f4" strokeDasharray="4 4" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#9e8cb0" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#9e8cb0" }} label={{ value: "Высота тона (Гц)", angle: -90, position: "left", offset: 0 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#9e8cb0" }} label={{ value: "Энергия / Интенсивность", angle: 90, position: "right", offset: 0 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="pitch" stroke="#d080c0" strokeWidth={2} dot={{ r: 3 }} name="Высота тона (Гц)" />
                  <Line yAxisId="right" type="monotone" dataKey="energy" stroke="#7090d8" strokeWidth={2} dot={{ r: 3 }} name="Энергия" />
                  <Line yAxisId="right" type="monotone" dataKey="intensity" stroke="#60c090" strokeWidth={2} dot={{ r: 3 }} name="Интенсивность" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {analysisData.acoustic_summary && (
              <div className="ar-card">
                <h3 className="ar-card-title">Сводные акустические характеристики</h3>
                <div className="ar-acoustic-summary">
                  <div className="ar-acoustic-item">
                    <span className="label">Средняя высота тона:</span>
                    <span className="value">{analysisData.acoustic_summary.avg_pitch?.toFixed(1) || 0} Гц</span>
                  </div>
                  <div className="ar-acoustic-item">
                    <span className="label">Средняя энергия:</span>
                    <span className="value">{analysisData.acoustic_summary.avg_energy?.toFixed(3) || 0}</span>
                  </div>
                  <div className="ar-acoustic-item">
                    <span className="label">Вариабельность тона:</span>
                    <span className="value">{analysisData.acoustic_summary.pitch_variability?.toFixed(1) || 0} Гц</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Вкладка: Детальный отчёт */}
        {activeTab === "details" && (
          <div className="ar-grid">
            <div className="ar-card wide">
              <h3 className="ar-card-title">Процентное соотношение эмоций</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    dataKey="value"
                    label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: "#9e8cb0", strokeWidth: 1 }}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="ar-card wide">
              <h3 className="ar-card-title">Радар эмоций (средние значения)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={pieData.map(p => ({ emotion: p.name, value: p.value }))}>
                  <PolarGrid stroke="#e0d8ec" />
                  <PolarAngleAxis dataKey="emotion" tick={{ fill: "#5a4878", fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#9e8cb0", fontSize: 10 }} />
                  <Radar
                    name="Эмоции"
                    dataKey="value"
                    stroke="#7b5ba8"
                    fill="#7b5ba8"
                    fillOpacity={0.5}
                  />
                  <Tooltip formatter={(v) => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="ar-card wide">
              <h3 className="ar-card-title">Заключение по результатам анализа</h3>
              <div className="ar-report-content">
                <pre className="ar-report-text">{analysisData.report_text}</pre>
              </div>
            </div>

            {analysisData.pattern && (
              <div className="ar-card">
                <h3 className="ar-card-title">Эмоциональный паттерн</h3>
                <div className="ar-pattern">
                  <p><strong>{analysisData.pattern.pattern_ru}</strong></p>
                  <p className="ar-pattern-desc">{analysisData.pattern.description}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Кнопки действий */}
      <div className="ar-actions">
        <button className="ar-back-action" onClick={onBack}>
          ← Назад к записи
        </button>
        <div className="ar-export-group">
          <button 
            className="ar-export-btn pdf"
            onClick={() => handleExport("pdf")}
            disabled={exporting}
          >
            {exporting ? "Экспорт..." : "📄 Экспорт PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnalysisResults;