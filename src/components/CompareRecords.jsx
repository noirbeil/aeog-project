// src/components/CompareRecords.jsx
import { useState, useEffect, useRef } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { searchPatients } from "../api/patients";
import { getPatientSessionDates, compareSessions } from "../api/compare";
import "./CompareRecords.css";

const EMOTION_RU = {
  joy:     "Радость",
  sadness: "Грусть",
  anger:   "Злость",
  fear:    "Страх",
  disgust: "Брезгливость",
  neutral: "Нейтрально",
  surprise:"Удивление",
};

const EMOTION_COLOR = {
  joy:     "#f0c040",
  sadness: "#5b9bd5",
  anger:   "#e06060",
  fear:    "#a0c878",
  disgust: "#9b7fc7",
  neutral: "#9e9e9e",
  surprise:"#ffa07a",
};

const SESSION_COLORS = ["#7b5ba8", "#e06a8c"];

// ── Поле с датапикером-подсказками ──────────────────────────────
function DatePickerWithHints({ label, value, onChange, hints, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = hints.filter((h) =>
    !value || h.date.includes(value) || h.label.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="cr-datepicker" ref={ref}>
      <label className="cr-field-label">{label}</label>
      <input
        className="cr-input"
        type="text"
        placeholder="ГГГГ-ММ-ДД или название"
        value={value}
        disabled={disabled}
        onChange={(e) => { onChange(null, e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="cr-hints">
          {filtered.map((h) => (
            <li
              key={h.session_id}
              className="cr-hint-item"
              onMouseDown={() => {
                onChange(h.session_id, h.date);
                setOpen(false);
              }}
            >
              <span className="cr-hint-date">{h.date}</span>
              <span className="cr-hint-label">{h.label}</span>
            </li>
          ))}
        </ul>
      )}
      {open && hints.length === 0 && !disabled && (
        <div className="cr-hints cr-hints-empty">Нет доступных сеансов</div>
      )}
    </div>
  );
}

// ── Карточка изменения эмоции ────────────────────────────────────
function DeltaCard({ emotion, delta }) {
  const sign = delta > 0 ? "+" : "";
  const pct  = Math.round(delta * 100);
  const neutral = Math.abs(delta) < 0.01;
  const positive = delta > 0;
  return (
    <div className={`cr-card ${neutral ? "neutral" : positive ? "up" : "down"}`}>
      <div className="cr-card-icon">{neutral ? "→" : positive ? "↑" : "↓"}</div>
      <div className="cr-value">{neutral ? "0%" : `${sign}${pct}%`}</div>
      <div className="cr-label">{EMOTION_RU[emotion] || emotion}</div>
    </div>
  );
}

// ── Основной компонент ───────────────────────────────────────────
function CompareRecords() {
  const [patientQuery, setPatientQuery]         = useState("");
  const [patientSuggestions, setPatientSugg]    = useState([]);
  const [selectedPatient, setSelectedPatient]   = useState(null);
  const [patientOpen, setPatientOpen]           = useState(false);
  const patientRef = useRef(null);

  const [sessionDates, setSessionDates]         = useState([]);
  const [session1Id, setSession1Id]             = useState(null);
  const [session1Text, setSession1Text]         = useState("");
  const [session2Id, setSession2Id]             = useState(null);
  const [session2Text, setSession2Text]         = useState("");

  const [compareData, setCompareData]           = useState(null);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState(null);

  // Закрытие дропдауна пациента
  useEffect(() => {
    const h = (e) => {
      if (patientRef.current && !patientRef.current.contains(e.target))
        setPatientOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Поиск пациентов
  useEffect(() => {
    if (!patientQuery.trim()) { setPatientSugg([]); return; }
    const t = setTimeout(async () => {
      try {
        const list = await searchPatients(patientQuery);
        setPatientSugg(list.slice(0, 8));
        setPatientOpen(true);
      } catch { setPatientSugg([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery]);

  // Загрузка дат при выборе пациента
  useEffect(() => {
    if (!selectedPatient) return;
    getPatientSessionDates(selectedPatient.id)
      .then(setSessionDates)
      .catch(() => setSessionDates([]));
    setSession1Id(null); setSession1Text("");
    setSession2Id(null); setSession2Text("");
    setCompareData(null); setError(null);
  }, [selectedPatient]);

  const handleCompare = async () => {
    if (!session1Id || !session2Id) { setError("Выберите оба сеанса из подсказок"); return; }
    if (session1Id === session2Id)  { setError("Выберите два разных сеанса"); return; }
    setLoading(true); setError(null); setCompareData(null);
    try {
      const data = await compareSessions(session1Id, session2Id);
      setCompareData(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Подготовка данных для графиков ───────────────────────────
  const prepareRadarData = () => {
    if (!compareData) return [];
    const ems = new Set([
      ...Object.keys(compareData.session_1.aggregated_emotions),
      ...Object.keys(compareData.session_2.aggregated_emotions),
    ]);
    return [...ems].map((em) => ({
      emotion: EMOTION_RU[em] || em,
      [compareData.session_1.session_date]: Math.round((compareData.session_1.aggregated_emotions[em] || 0) * 100),
      [compareData.session_2.session_date]: Math.round((compareData.session_2.aggregated_emotions[em] || 0) * 100),
    }));
  };

  const prepareBarData = () => {
    if (!compareData) return [];
    const ems = new Set([
      ...Object.keys(compareData.session_1.aggregated_emotions),
      ...Object.keys(compareData.session_2.aggregated_emotions),
    ]);
    return [...ems].map((em) => ({
      emotion: EMOTION_RU[em] || em,
      session1: Math.round((compareData.session_1.aggregated_emotions[em] || 0) * 100),
      session2: Math.round((compareData.session_2.aggregated_emotions[em] || 0) * 100),
    }));
  };

  const prepareTimelineData = () => {
    if (!compareData) return [];
    const pts1 = compareData.session_1.timeline.map((t, i) => ({ idx: i + 1, "Сеанс 1": Math.round((t.intensity || 0) * 100) }));
    const pts2 = compareData.session_2.timeline.map((t, i) => ({ idx: i + 1, "Сеанс 2": Math.round((t.intensity || 0) * 100) }));
    const len  = Math.max(pts1.length, pts2.length);
    return Array.from({ length: len }, (_, i) => ({
      idx: i + 1,
      "Сеанс 1": pts1[i]?.["Сеанс 1"] ?? null,
      "Сеанс 2": pts2[i]?.["Сеанс 2"] ?? null,
    }));
  };

  const deltaEntries = compareData
    ? Object.entries(compareData.delta).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    : [];

  return (
    <div className="cr-container">

      <div className="cr-header">
        <h2 className="cr-title">Сравнение сеансов</h2>
        <p className="cr-subtitle">Выберите пациента и два сеанса для сравнения динамики эмоций</p>
      </div>

      {/* ── Поиск ── */}
      <div className="cr-search">

        <div className="cr-patient-picker" ref={patientRef}>
          <label className="cr-field-label">Пациент</label>
          <input
            className="cr-input"
            placeholder="Введите ФИО пациента"
            value={patientQuery}
            onChange={(e) => { setPatientQuery(e.target.value); setSelectedPatient(null); }}
            onFocus={() => patientSuggestions.length && setPatientOpen(true)}
            autoComplete="off"
          />
          {patientOpen && patientSuggestions.length > 0 && (
            <ul className="cr-hints">
              {patientSuggestions.map((p) => (
                <li
                  key={p.id}
                  className="cr-hint-item"
                  onMouseDown={() => {
                    setSelectedPatient(p);
                    setPatientQuery(`${p.name} ${p.surname}`);
                    setPatientOpen(false);
                  }}
                >
                  <span className="cr-hint-date">{p.name} {p.surname}</span>
                  {p.birth_date && <span className="cr-hint-label">{p.birth_date}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DatePickerWithHints
          label="Сеанс 1"
          value={session1Text}
          hints={sessionDates.filter((h) => h.session_id !== session2Id)}
          disabled={!selectedPatient}
          onChange={(id, text) => { setSession1Id(id); setSession1Text(text); }}
        />

        <DatePickerWithHints
          label="Сеанс 2"
          value={session2Text}
          hints={sessionDates.filter((h) => h.session_id !== session1Id)}
          disabled={!selectedPatient}
          onChange={(id, text) => { setSession2Id(id); setSession2Text(text); }}
        />

        <button
          className="cr-btn"
          onClick={handleCompare}
          disabled={loading || !session1Id || !session2Id}
        >
          {loading ? <span className="cr-spinner" /> : "Сравнить"}
        </button>
      </div>

      {error && <div className="cr-error">{error}</div>}

      {/* ── Результаты ── */}
      {compareData && (
        <>
          <div className="cr-sessions-header">
            <div className="cr-session-badge" style={{ borderColor: SESSION_COLORS[0] }}>
              <span className="cr-session-dot" style={{ background: SESSION_COLORS[0] }} />
              <div>
                <div className="cr-session-name">{compareData.session_1.project_name}</div>
                <div className="cr-session-date">{compareData.session_1.session_date}</div>
              </div>
              <span className="cr-dominant-tag" style={{ background: EMOTION_COLOR[compareData.session_1.dominant_emotion] }}>
                {EMOTION_RU[compareData.session_1.dominant_emotion] || compareData.session_1.dominant_emotion}
              </span>
            </div>

            <div className="cr-vs">VS</div>

            <div className="cr-session-badge" style={{ borderColor: SESSION_COLORS[1] }}>
              <span className="cr-session-dot" style={{ background: SESSION_COLORS[1] }} />
              <div>
                <div className="cr-session-name">{compareData.session_2.project_name}</div>
                <div className="cr-session-date">{compareData.session_2.session_date}</div>
              </div>
              <span className="cr-dominant-tag" style={{ background: EMOTION_COLOR[compareData.session_2.dominant_emotion] }}>
                {EMOTION_RU[compareData.session_2.dominant_emotion] || compareData.session_2.dominant_emotion}
              </span>
            </div>
          </div>

          <div className="cr-cards">
            {deltaEntries.map(([em, delta]) => (
              <DeltaCard key={em} emotion={em} delta={delta} />
            ))}
          </div>

          <div className="cr-grid">
            <div className="cr-box">
              <h3 className="cr-box-title">Изменение интенсивности эмоций</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={prepareBarData()} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid stroke="#ece8f4" strokeDasharray="4 4" />
                  <XAxis dataKey="emotion" tick={{ fontSize: 11, fill: "#9e8cb0" }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#9e8cb0" }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend formatter={(v) => v === "session1" ? compareData.session_1.session_date : compareData.session_2.session_date} />
                  <Bar dataKey="session1" name="session1" fill={SESSION_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="session2" name="session2" fill={SESSION_COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="cr-box">
              <h3 className="cr-box-title">Профиль эмоций (радар)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={prepareRadarData()}>
                  <PolarGrid stroke="#e0d8ec" />
                  <PolarAngleAxis dataKey="emotion" tick={{ fill: "#5a4878", fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#9e8cb0", fontSize: 9 }} />
                  <Radar name={compareData.session_1.session_date} dataKey={compareData.session_1.session_date}
                    stroke={SESSION_COLORS[0]} fill={SESSION_COLORS[0]} fillOpacity={0.35} />
                  <Radar name={compareData.session_2.session_date} dataKey={compareData.session_2.session_date}
                    stroke={SESSION_COLORS[1]} fill={SESSION_COLORS[1]} fillOpacity={0.35} />
                  <Legend />
                  <Tooltip formatter={(v) => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="cr-box wide">
              <h3 className="cr-box-title">Динамика изменений у испытуемого</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prepareTimelineData()} margin={{ top: 5, right: 20, left: -10, bottom: 15 }}>
                  <CartesianGrid stroke="#ece8f4" strokeDasharray="4 4" />
                  <XAxis dataKey="idx" label={{ value: "Сегмент", position: "insideBottom", offset: -5, fill: "#9e8cb0", fontSize: 11 }} tick={{ fontSize: 10, fill: "#9e8cb0" }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#9e8cb0" }} domain={[0, 100]} />
                  <Tooltip formatter={(v) => v !== null ? `${v}%` : "—"} labelFormatter={(l) => `Сегмент ${l}`} />
                  <Legend />
                  <Line type="monotone" dataKey="Сеанс 1" stroke={SESSION_COLORS[0]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  <Line type="monotone" dataKey="Сеанс 2" stroke={SESSION_COLORS[1]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!compareData && !loading && !error && (
        <div className="cr-empty">
          <div className="cr-empty-icon">⟺</div>
          <p>Выберите пациента и два сеанса, чтобы увидеть сравнение</p>
        </div>
      )}
    </div>
  );
}

export default CompareRecords;