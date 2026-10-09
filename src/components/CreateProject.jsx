// src/components/CreateProject.jsx
import { useState } from "react";
import { createSession } from "../api/sessions";
import { createPatient, searchPatients } from "../api/patients";
import VoiceRecord from "./VoiceRecord";
import AnalysisResults from "./AnalysisResults";
import "./CreateProject.css";

function CreateProject({ onProjectCreated, onProjectCreatedWithId }) {
  const [step, setStep] = useState("form"); // "form", "record", "results"
  const [createdSessionId, setCreatedSessionId] = useState(null);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: "",
    patient_surname: "",
    patient_birth_date: "",
    patient_gender: "",
    existing_patient_id: "",
    existing_patient_name: "",
    showPatientSearch: false,
    searchResults: [],
    session_date: new Date().toISOString().split('T')[0],
    session_time: "",
    notes: "",
    emotions: {
      anger: true,
      disgust: false,
      fear: false,
      joy: true,
      sadness: true
    },
    threshold: 0.5,
    result_format: "table",
    ml_model: "EmotionNet",
    sensitivity: 0.7
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createNewPatient, setCreateNewPatient] = useState(true);

  const handleSearchPatient = async () => {
    if (!formData.existing_patient_name.trim()) return;
    try {
      const results = await searchPatients(formData.existing_patient_name);
      setFormData({
        ...formData,
        searchResults: results
      });
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const handleEmotionChange = (emotion) => {
    setFormData({
      ...formData,
      emotions: {
        ...formData.emotions,
        [emotion]: !formData.emotions[emotion]
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      let patient_id = null;
      
      if (createNewPatient) {
        if (!formData.patient_name || !formData.patient_surname) {
          throw new Error("Введите имя и фамилию пациента");
        }
        
        const newPatient = await createPatient({
          name: formData.patient_name,
          surname: formData.patient_surname,
          birth_date: formData.patient_birth_date || null,
          gender: formData.patient_gender || null,
          status: "active"
        });
        patient_id = newPatient.id;
      } else {
        if (!formData.existing_patient_id) {
          throw new Error("Выберите пациента из списка");
        }
        patient_id = parseInt(formData.existing_patient_id);
      }
      
      const selectedEmotions = Object.entries(formData.emotions)
        .filter(([_, isSelected]) => isSelected)
        .map(([emotion]) => emotion);
      
      if (selectedEmotions.length === 0) {
        throw new Error("Выберите хотя бы одну эмоцию для анализа");
      }
      
      const sessionData = {
        patient_id: patient_id,
        session_date: formData.session_date,
        session_time: formData.session_time || null,
        duration: null,
        notes: formData.notes || null,
        status: "planned",
        analysis_config: {
          emotions_to_analyze: selectedEmotions,
          threshold_value: parseFloat(formData.threshold),
          result_format: formData.result_format,
          ml_model_type: formData.ml_model,
          sensitivity: parseFloat(formData.sensitivity)
        }
      };
      
      const result = await createSession(sessionData);
      setSuccess(`Проект успешно создан! ID сессии: ${result.id}`);
      setCreatedSessionId(result.id);
      
      setStep("record");
      
      if (onProjectCreated) {
        onProjectCreated(result);
      }
      
      if (onProjectCreatedWithId) {
        onProjectCreatedWithId(result.id);
      }
      
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Ошибка при создании проекта");
    } finally {
      setLoading(false);
    }
  };

  // Переход к результатам анализа
  const handleRecordingComplete = (audioResult) => {
    console.log("Recording complete, moving to results for session:", createdSessionId);
    setStep("results");
    setAnalysisCompleted(true);
  };

  // Обработка начала анализа (можно показать статус)
  const handleAnalysisStart = (sessionId) => {
    console.log("Analysis started for session:", sessionId);
  };

  // Возврат из результатов
  const handleBackFromResults = () => {
    setStep("form");
    setCreatedSessionId(null);
    setAnalysisCompleted(false);
  };

  // Возврат из записи
  const handleBackFromRecord = () => {
    setStep("form");
  };

  // Если на этапе результатов - показываем окно анализа
  if (step === "results" && createdSessionId) {
    return (
      <AnalysisResults 
        sessionId={createdSessionId}
        onBack={handleBackFromResults}
        onExport={(format) => console.log(`Exporting as ${format}...`)}
      />
    );
  }

  // Если на этапе записи - показываем компонент записи
  if (step === "record" && createdSessionId) {
    return (
      <VoiceRecord 
        sessionId={createdSessionId}
        onBack={handleBackFromRecord}
        onComplete={handleRecordingComplete}
        onAnalysisStart={handleAnalysisStart}
      />
    );
  }

  return (
    <div className="create-container">
      <div className="create-title">Создание проекта</div>
      
      <form onSubmit={handleSubmit}>
        {/* Переключение между новым и существующим пациентом */}
        <div className="create-card">
          <label>Пациент</label>
          <div style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>
            <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input 
                type="radio" 
                checked={createNewPatient}
                onChange={() => setCreateNewPatient(true)}
              />
              Новый пациент
            </label>
            <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input 
                type="radio" 
                checked={!createNewPatient}
                onChange={() => setCreateNewPatient(false)}
              />
              Существующий пациент
            </label>
          </div>
        </div>
        
        {/* Форма нового пациента */}
        {createNewPatient && (
          <>
            <div className="create-grid">
              <div className="create-card">
                <label>Имя пациента *</label>
                <input 
                  type="text" 
                  placeholder="Имя"
                  value={formData.patient_name}
                  onChange={(e) => setFormData({...formData, patient_name: e.target.value})}
                  required
                />
              </div>
              
              <div className="create-card">
                <label>Фамилия пациента *</label>
                <input 
                  type="text" 
                  placeholder="Фамилия"
                  value={formData.patient_surname}
                  onChange={(e) => setFormData({...formData, patient_surname: e.target.value})}
                  required
                />
              </div>
              
              <div className="create-card">
                <label>Дата рождения</label>
                <input 
                  type="date"
                  value={formData.patient_birth_date}
                  onChange={(e) => setFormData({...formData, patient_birth_date: e.target.value})}
                />
              </div>
              
              <div className="create-card">
                <label>Пол</label>
                <select 
                  value={formData.patient_gender}
                  onChange={(e) => setFormData({...formData, patient_gender: e.target.value})}
                >
                  <option value="">Не указано</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>
            </div>
          </>
        )}
        
        {/* Поиск существующего пациента */}
        {!createNewPatient && (
          <div className="create-card">
            <label>Поиск пациента</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input 
                type="text" 
                placeholder="Введите имя или фамилию"
                value={formData.existing_patient_name}
                onChange={(e) => setFormData({...formData, existing_patient_name: e.target.value, searchResults: []})}
              />
              <button type="button" onClick={handleSearchPatient} style={{ padding: "0 20px" }}>
                Найти
              </button>
            </div>
            
            {formData.searchResults.length > 0 && (
              <div className="search-results">
                {formData.searchResults.map(patient => (
                  <div 
                    key={patient.id}
                    className={`search-result-item ${formData.existing_patient_id === String(patient.id) ? "selected" : ""}`}
                    onClick={() => setFormData({
                      ...formData, 
                      existing_patient_id: String(patient.id),
                      existing_patient_name: `${patient.name} ${patient.surname}`,
                      searchResults: []
                    })}
                  >
                    {patient.name} {patient.surname} 
                    {patient.birth_date && ` (${patient.birth_date})`}
                  </div>
                ))}
              </div>
            )}
            
            {formData.existing_patient_id && (
              <div style={{ marginTop: "10px", color: "#4caf50" }}>
                ✓ Выбран: {formData.existing_patient_name}
              </div>
            )}
          </div>
        )}
        
        <div className="create-grid">
          <div className="create-card">
            <label>Дата сессии *</label>
            <input 
              type="date"
              value={formData.session_date}
              onChange={(e) => setFormData({...formData, session_date: e.target.value})}
              required
            />
          </div>
          
          <div className="create-card">
            <label>Время сессии</label>
            <input 
              type="time"
              value={formData.session_time}
              onChange={(e) => setFormData({...formData, session_time: e.target.value})}
            />
          </div>
          
          <div className="create-card wide">
            <label>Название проекта</label>
            <textarea 
              rows="3"
              placeholder="Введите название проекта"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          
          <div className="create-card">
            <label>Какие эмоции анализировать? *</label>
            <div className="emotion-list">
              <label className="emotion-item">
                <input 
                  type="checkbox" 
                  checked={formData.emotions.anger}
                  onChange={() => handleEmotionChange('anger')}
                /> Злость
              </label>
              <label className="emotion-item">
                <input 
                  type="checkbox" 
                  checked={formData.emotions.disgust}
                  onChange={() => handleEmotionChange('disgust')}
                /> Брезгливость
              </label>
              <label className="emotion-item">
                <input 
                  type="checkbox" 
                  checked={formData.emotions.fear}
                  onChange={() => handleEmotionChange('fear')}
                /> Страх
              </label>
              <label className="emotion-item">
                <input 
                  type="checkbox" 
                  checked={formData.emotions.joy}
                  onChange={() => handleEmotionChange('joy')}
                /> Радость
              </label>
              <label className="emotion-item">
                <input 
                  type="checkbox" 
                  checked={formData.emotions.sadness}
                  onChange={() => handleEmotionChange('sadness')}
                /> Грусть
              </label>
            </div>
          </div>
          
          <div className="create-card">
            <label>Пороговое значение: {formData.threshold.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={formData.threshold}
              onChange={(e) => setFormData({...formData, threshold: parseFloat(e.target.value)})}
            />
            <small>Минимальная интенсивность эмоции для регистрации</small>
          </div>
          
          
          
          
          
          <div className="create-card">
            <label>Чувствительность анализа: {formData.sensitivity.toFixed(2)}</label>
            <input 
              type="range" 
              min="0.1" 
              max="1" 
              step="0.05"
              value={formData.sensitivity}
              onChange={(e) => setFormData({...formData, sensitivity: parseFloat(e.target.value)})}
            />
            <small>Выше = больше эмоций будет обнаружено (но возможны ложные срабатывания)</small>
          </div>
        </div>
        
        {error && <div className="create-error">{error}</div>}
        {success && <div className="create-success">{success}</div>}
        
        <button type="submit" className="create-btn" disabled={loading}>
          {loading ? "Создание..." : "Создать проект и продолжить"}
        </button>
      </form>
    </div>
  );
}

export default CreateProject;