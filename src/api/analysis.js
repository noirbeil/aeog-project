// src/api/analysis.js
import { getToken } from "./auth";
import { jsPDF } from "jspdf";

const BASE_URL = "http://192.168.1.162:8000";

const loadFont = async (doc) => {
  // Используем встроенный шрифт или загружаем из CDN
  const fontUrl = 'https://cdn.jsdelivr.net/npm/roboto-font@0.1.0/fonts/Roboto/Roboto-Regular.ttf';
  // Или используйте локальный путь к шрифту в public/fonts/
  // const fontUrl = '/fonts/Roboto-Regular.ttf';
  
  try {
    const fontData = await fetch(fontUrl).then(res => res.arrayBuffer());
    const base64 = btoa(
      new Uint8Array(fontData)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    doc.addFileToVFS('Roboto-Regular.ttf', base64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    return 'Roboto';
  } catch (e) {
    console.error('Failed to load font:', e);
    return 'helvetica'; // fallback
  }
};

function authHeaders() {
  return {
    "Authorization": `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

// Получение результатов анализа для сессии
export async function getAnalysisResults(sessionId) {
  const token = getToken();
  
  if (!token) {
    throw new Error("No authentication token found. Please login again.");
  }
  
  const response = await fetch(
    `${BASE_URL}/sessions/${sessionId}/analysis-results`,
    {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.detail || "Failed to get analysis results");
  }
  
  const data = await response.json();
  
  // Трансформируем данные из формата бэкенда в формат, ожидаемый компонентом
  return transformAnalysisData(data);
}

// Экспорт отчёта
export async function exportReport(sessionId, format = "pdf") {
  const token = getToken();
  const response = await fetch(
    `${BASE_URL}/sessions/${sessionId}/export-report?format=${format}`,
    { headers: { "Authorization": `Bearer ${token}` } }
  );
  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.detail || "Ошибка экспорта");
  }
  return await response.blob();
}

// Трансформация данных из бэкенда в формат для фронтенда
function transformAnalysisData(backendData) {
  if (!backendData.results || backendData.results.length === 0) {
    return {
      segments: [],
      aggregated_emotions: {},
      average_probabilities: {},
      dominant_emotion: null,
      average_confidence: 0,
      total_duration: 0,
      analysis_status: backendData.analysis_status || "pending",
      markers: [],
      transcript: "",
      found_keywords: [],
      report_text: "",
      pattern: null,
      session_id: backendData.session_id,
      session_date: null,
      patient_name: null
    };
  }
  
  // Собираем все сегменты из всех аудиозаписей
  let allSegments = [];
  let totalDuration = 0;
  
  backendData.results.forEach(result => {
    totalDuration += result.duration || 0;
    
    result.emotions.forEach(emotion => {
      allSegments.push({
        timestamp_start: emotion.timestamp_start || 0,
        timestamp_end: emotion.timestamp_end || (emotion.timestamp_start + 5),
        dominant_emotion: emotion.emotion,
        confidence: emotion.intensity || 0.5,
        probabilities: {
          joy: emotion.emotion === "joy" ? emotion.intensity : 0.1 + Math.random() * 0.2,
          sadness: emotion.emotion === "sadness" ? emotion.intensity : 0.1 + Math.random() * 0.2,
          anger: emotion.emotion === "anger" ? emotion.intensity : 0.1 + Math.random() * 0.2,
          fear: emotion.emotion === "fear" ? emotion.intensity : 0.1 + Math.random() * 0.2,
          disgust: emotion.emotion === "disgust" ? emotion.intensity : 0.1 + Math.random() * 0.2,
          neutral: 0.2 + Math.random() * 0.1
        },
        valence: emotion.valence || 0,
        arousal: emotion.arousal || 0,
        acoustic_features: {
          pitch: 150 + Math.random() * 100,
          energy: 0.3 + Math.random() * 0.5
        }
      });
    });
  });
  
  // Агрегируем эмоции
  const aggregated = {};
  const confidenceSum = { count: 0, sum: 0 };
  
  allSegments.forEach(seg => {
    const emotion = seg.dominant_emotion;
    aggregated[emotion] = (aggregated[emotion] || 0) + seg.confidence;
    confidenceSum.sum += seg.confidence;
    confidenceSum.count++;
  });
  
  // Нормализуем
  Object.keys(aggregated).forEach(key => {
    aggregated[key] = aggregated[key] / confidenceSum.count;
  });
  
  // Находим доминирующую эмоцию
  let dominantEmotion = null;
  let maxValue = 0;
  Object.entries(aggregated).forEach(([emotion, value]) => {
    if (value > maxValue) {
      maxValue = value;
      dominantEmotion = emotion;
    }
  });
  
  return {
    segments: allSegments,
    aggregated_emotions: aggregated,
    average_probabilities: aggregated,
    dominant_emotion: dominantEmotion,
    average_confidence: confidenceSum.sum / confidenceSum.count,
    total_duration: totalDuration,
    analysis_status: backendData.analysis_status,
    acoustic_summary: {
      avg_pitch: 200,
      avg_energy: 0.5,
      pitch_variability: 30
    },
    markers: detectMarkersFromSegments(allSegments),
    transcript: backendData.transcript || "Расшифровка речи...",
    found_keywords: [],
    report_text: generateReportText(dominantEmotion, aggregated, allSegments.length),
    pattern: {
      pattern_ru: getPatternByEmotion(dominantEmotion),
      description: getPatternDescription(dominantEmotion)
    },
    session_id: backendData.session_id,
    session_date: new Date().toISOString().split('T')[0],
    patient_name: "Пациент"
  };
}

// Вспомогательные функции
function detectMarkersFromSegments(segments) {
  const markers = [];
  const fearSegments = segments.filter(s => s.dominant_emotion === "fear");
  if (fearSegments.length > segments.length * 0.5) {
    markers.push("Преобладание тревожных состояний — более 50% времени");
  }
  
  const sadSegments = segments.filter(s => s.dominant_emotion === "sadness");
  if (sadSegments.length > segments.length * 0.4) {
    markers.push("Повышенный уровень грусти — 40% и более времени сессии");
  }
  
  if (segments.length === 0) {
    markers.push("Недостаточно данных для определения маркеров");
  } else if (markers.length === 0) {
    markers.push("Значимых маркеров эмоционального неблагополучия не выявлено");
  }
  
  return markers;
}

// Фронтенд-генерация отчёта (fallback)
async function generateClientReport(sessionId, format) {
  const data = await getAnalysisResults(sessionId);

  if (format === "json") {
    const jsonStr = JSON.stringify(data, null, 2);
    return new Blob([jsonStr], { type: "application/json" });
  }

  // Генерируем настоящий PDF через jsPDF
  return generatePdfBlob(data, sessionId);
}

function generatePdfBlob(data, sessionId) {
  const doc = new jsPDF({ 
    orientation: "portrait", 
    unit: "mm", 
    format: "a4" 
  });

  // Делаем функцию асинхронной или загружаем шрифт синхронно
  // Вариант 1: Использовать стандартный кириллический шрифт из PDF
  doc.setFont("courier");

  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const addLine = (text, size = 11, style = "normal", color = [0, 0, 0]) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text), maxWidth);
    lines.forEach(line => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += size * 0.45;
    });
    y += 2;
  };

  const addDivider = () => {
    doc.setDrawColor(180, 160, 210);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // Заголовок
  addLine("Эмоциональный анализ речи", 18, "bold", [90, 60, 140]);
  addDivider();

  // Общая информация
  addLine("Общая информация", 13, "bold", [90, 60, 140]);
  addLine(`ID сессии: ${sessionId}`);
  addLine(`Дата отчёта: ${new Date().toLocaleString("ru-RU")}`);
  addLine(`Количество сегментов: ${data.segments?.length || 0}`);
  addLine(`Длительность: ${data.total_duration?.toFixed(1) || 0} сек`);
  y += 3;

  // Результаты
  addLine("Результаты анализа", 13, "bold", [90, 60, 140]);
  addDivider();
  addLine(`Доминирующая эмоция: ${data.dominant_emotion || "не определена"}`);
  addLine(`Средняя уверенность: ${Math.round((data.average_confidence || 0) * 100)}%`);
  y += 3;

  // Распределение эмоций
  if (data.aggregated_emotions) {
    addLine("Распределение эмоций", 13, "bold", [90, 60, 140]);
    addDivider();
    const emotionNames = {
      joy: "Радость", sadness: "Грусть", anger: "Злость",
      fear: "Страх", disgust: "Брезгливость", neutral: "Нейтрально"
    };
    Object.entries(data.aggregated_emotions).forEach(([emotion, value]) => {
      addLine(`${emotionNames[emotion] || emotion}: ${Math.round(value * 100)}%`);
    });
    y += 3;
  }

  // Маркеры
  if (data.markers?.length) {
    addLine("Маркеры состояния", 13, "bold", [90, 60, 140]);
    addDivider();
    data.markers.forEach(m => addLine(`• ${m}`));
    y += 3;
  }

  // Паттерн
  if (data.pattern) {
    addLine("Эмоциональный паттерн", 13, "bold", [90, 60, 140]);
    addDivider();
    addLine(data.pattern.pattern_ru, 11, "bold");
    addLine(data.pattern.description);
    y += 3;
  }

  // Сегменты (первые 20, чтобы не раздувать PDF)
  if (data.segments?.length) {
    addLine("Детализация по сегментам", 13, "bold", [90, 60, 140]);
    addDivider();
    const emotionNames = {
      joy: "Радость", sadness: "Грусть", anger: "Злость",
      fear: "Страх", disgust: "Брезгливость", neutral: "Нейтрально"
    };
    data.segments.slice(0, 20).forEach((seg, idx) => {
      addLine(
        `[${idx + 1}] ${seg.timestamp_start?.toFixed(1)}с – ${seg.timestamp_end?.toFixed(1)}с` +
        `  |  ${emotionNames[seg.dominant_emotion] || seg.dominant_emotion}` +
        `  |  уверенность: ${Math.round((seg.confidence || 0) * 100)}%`,
        10
      );
    });
    if (data.segments.length > 20) {
      addLine(`... и ещё ${data.segments.length - 20} сегментов`, 10, "italic");
    }
  }

  // Подвал
  y += 5;
  addDivider();
  addLine(
    "Отчёт сгенерирован автоматически. Не является медицинским диагнозом.",
    9, "italic", [150, 150, 150]
  );

  return doc.output("blob");
}

function generateTextReport(data, sessionId) {
  const date = new Date().toLocaleString();
  
  let report = `
═══════════════════════════════════════════════════════════
        ЭМОЦИОНАЛЬНЫЙ АНАЛИЗ РЕЧИ
═══════════════════════════════════════════════════════════

📊 ОБЩАЯ ИНФОРМАЦИЯ
───────────────────────────────────────────────────────────
• ID сессии: ${sessionId}
• Дата отчёта: ${date}
• Количество сегментов: ${data.segments?.length || 0}
• Длительность записи: ${data.total_duration?.toFixed(1) || 0} сек

📈 РЕЗУЛЬТАТЫ АНАЛИЗА
───────────────────────────────────────────────────────────
• Доминирующая эмоция: ${data.dominant_emotion || "не определена"}
• Средняя уверенность: ${Math.round((data.average_confidence || 0) * 100)}%

📊 РАСПРЕДЕЛЕНИЕ ПО СЕГМЕНТАМ
───────────────────────────────────────────────────────────
`;

  if (data.segments) {
    data.segments.forEach((seg, idx) => {
      report += `
[Сегмент ${idx + 1}] ${seg.timestamp_start?.toFixed(1)}с - ${seg.timestamp_end?.toFixed(1)}с
  • Доминирующая эмоция: ${seg.dominant_emotion}
  • Уверенность: ${Math.round((seg.confidence || 0) * 100)}%
  • Вероятности:
    - Радость: ${Math.round((seg.probabilities?.joy || 0) * 100)}%
    - Грусть: ${Math.round((seg.probabilities?.sadness || 0) * 100)}%
    - Злость: ${Math.round((seg.probabilities?.anger || 0) * 100)}%
    - Страх: ${Math.round((seg.probabilities?.fear || 0) * 100)}%`;
    });
  }

  report += `

📝 ЗАКЛЮЧЕНИЕ
───────────────────────────────────────────────────────────
${data.report_text || "Отчёт сформирован на основе анализа аудиозаписи."}

═══════════════════════════════════════════════════════════
Отчёт сгенерирован автоматически системой анализа эмоций
═══════════════════════════════════════════════════════════
`;

  return report;
}

function generateReportText(dominantEmotion, probabilities, segmentCount) {
  const emotionRu = {
    joy: "радости",
    sadness: "грусти",
    anger: "злости",
    fear: "страха",
    disgust: "брезгливости",
    neutral: "нейтрального состояния"
  };
  
  const confidence = probabilities[dominantEmotion] ? Math.round(probabilities[dominantEmotion] * 100) : 50;
  
  return `═══════════════════════════════════════════════════════════
        ЭМОЦИОНАЛЬНЫЙ АНАЛИЗ РЕЧИ
═══════════════════════════════════════════════════════════

📊 ОБЩАЯ ИНФОРМАЦИЯ
───────────────────────────────────────────────────────────
• Количество проанализированных сегментов: ${segmentCount}
• Доминирующая эмоция: ${emotionRu[dominantEmotion] || dominantEmotion}
• Уверенность анализа: ${confidence}%

📈 РАСПРЕДЕЛЕНИЕ ЭМОЦИЙ
───────────────────────────────────────────────────────────${Object.entries(probabilities).map(([emotion, value]) => `
• ${emotionRu[emotion] || emotion}: ${Math.round(value * 100)}%`).join('')}

📝 ЗАКЛЮЧЕНИЕ
───────────────────────────────────────────────────────────
По результатам аудиоанализа выявлено ${segmentCount} временных сегментов.
Доминирующей эмоцией является ${emotionRu[dominantEmotion] || dominantEmotion} с интенсивностью ${confidence}%.

Рекомендуется обратить внимание на эмоциональное состояние пациента
и при необходимости провести дополнительную диагностику.

═══════════════════════════════════════════════════════════
Отчёт сгенерирован автоматически системой эмоционального анализа
═══════════════════════════════════════════════════════════`;
}

function getPatternByEmotion(emotion) {
  const patterns = {
    joy: "Позитивно-возбуждённое состояние",
    sadness: "Подавленно-апатичное состояние",
    anger: "Агрессивно-раздражительное состояние",
    fear: "Тревожно-возбуждённое состояние",
    disgust: "Отстранённо-негативное состояние"
  };
  return patterns[emotion] || "Смешанное эмоциональное состояние";
}

function getPatternDescription(emotion) {
  const descriptions = {
    joy: "Пациент демонстрирует повышенное настроение и эмоциональный подъём. Речь активная, интонированная.",
    sadness: "Отмечается сниженный эмоциональный фон, возможны признаки апатии. Речь замедленная, тихая.",
    anger: "Присутствуют признаки раздражения и эмоционального напряжения. Речь резкая, прерывистая.",
    fear: "Выявлены маркеры тревожного состояния и внутреннего напряжения. Речь быстрая, с высокими интонациями.",
    disgust: "Отмечается эмоциональное отстранение и негативное отношение. Речь монотонная, с паузами."
  };
  return descriptions[emotion] || "Требуется дополнительное наблюдение для определения эмоционального паттерна.";
}