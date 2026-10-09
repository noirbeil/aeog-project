// src/components/VoiceRecord.jsx (обновлённая версия)
import { useState, useRef } from "react";
import { uploadAudio } from "../api/audio";
import "./VoiceRecord.css";

function VoiceRecord({ sessionId, onBack, onComplete, onAnalysisStart }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioFile, setAudioFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([audioBlob], `recording_${Date.now()}.wav`, { type: 'audio/wav' });
        setAudioFile(file);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      console.error("Ошибка доступа к микрофону:", err);
      setUploadError("Не удалось получить доступ к микрофону.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  }

  async function uploadAudioFile(file) {
    setUploading(true);
    setUploadError("");
    
    try {
      const result = await uploadAudio(sessionId, file);
      console.log("Аудио загружено:", result);
      setUploadSuccess(true);
      
      // Уведомляем о начале анализа
      if (onAnalysisStart) {
        onAnalysisStart(sessionId);
      }
      
      // Даём время для запуска анализа, затем переходим к результатам
      setTimeout(() => {
        console.log("Calling onComplete with result:", result);
        if (onComplete) {
          onComplete(result);
        }
      }, 2000); // Увеличил до 2 секунд, чтобы анализ успел запуститься
      
    } catch (err) {
      console.error("Ошибка загрузки:", err);
      setUploadError(err.message || "Ошибка при загрузке аудиофайла");
      setUploading(false);
    }
  }

  function handleMicClick() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      uploadAudioFile(file);
    }
  }

  function handleUploadClick() {
    if (audioFile && !uploading && !uploadSuccess) {
      uploadAudioFile(audioFile);
    }
  }

  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <div className="vr-container">
      <p className="vr-breadcrumb">
        <span className="vr-breadcrumb-link" onClick={onBack}>Создание проекта</span>
        <span className="vr-breadcrumb-sep"> | </span>
        <span>Запись голоса</span>
      </p>

      <div className="vr-center">
        <div className="vr-mic-card">
          <button
            className={`vr-mic-btn ${isRecording ? "recording" : ""}`}
            onClick={handleMicClick}
            disabled={uploading || uploadSuccess}
          >
            <svg width="56" height="68" viewBox="0 0 56 68" fill="none">
              <rect x="16" y="2" width="24" height="36" rx="12" fill="white"/>
              <path d="M6 30c0 12.15 9.85 22 22 22s22-9.85 22-22" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none"/>
              <line x1="28" y1="52" x2="28" y2="64" stroke="white" strokeWidth="4" strokeLinecap="round"/>
              <line x1="18" y1="64" x2="38" y2="64" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            </svg>
            <span className="vr-mic-label">
              {isRecording ? "Остановить" : "Записать голос"}
            </span>
          </button>

          {isRecording && (
            <div className="vr-timer">
              <span className="vr-timer-dot" />
              {formatTime(recordingTime)}
            </div>
          )}

          {audioFile && !isRecording && !uploadSuccess && (
            <div className="vr-file-info">
              <p className="vr-filename">✓ {audioFile.name}</p>
              {!uploading && !uploadSuccess && (
                <button className="vr-upload-submit" onClick={handleUploadClick} disabled={uploading}>
                  Отправить на анализ
                </button>
              )}
            </div>
          )}

          {uploading && (
            <div className="vr-uploading">
              <div className="vr-spinner"></div>
              <p>Загрузка и анализ аудио...</p>
            </div>
          )}

          {uploadSuccess && (
            <div className="vr-success">
              <p>✓ Аудио успешно загружено!</p>
              <p className="vr-success-note">Переход к результатам...</p>
            </div>
          )}

          {uploadError && (
            <div className="vr-error">
              <p>❌ {uploadError}</p>
            </div>
          )}
        </div>

        {!uploadSuccess && !uploading && (
          <>
            <p className="vr-or">или</p>
            <button className="vr-upload-btn" onClick={() => fileInputRef.current.click()} disabled={uploading || uploadSuccess}>
              Загрузить файл
            </button>
            <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleFileChange} disabled={uploading || uploadSuccess} />
          </>
        )}
      </div>
    </div>
  );
}

export default VoiceRecord;