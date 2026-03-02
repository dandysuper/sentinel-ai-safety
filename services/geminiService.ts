import { GoogleGenAI } from "@google/genai";
import { AIModel } from '../types';

let ai: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (e) {
  console.error("Failed to initialize Gemini client", e);
}

export const generateSafetyAnalysis = async (model: AIModel): Promise<string> => {
  if (!ai) {
    return "API-ключ не настроен. Невозможно сгенерировать анализ.";
  }

  const prompt = `
    Analyze the safety benchmark profile of the AI model "${model.name}" developed by ${model.developer}.

    The scores below are normalized to a 0-100 scale and sourced from MLCommons AILuminate v1.0 and HuggingFace DecodingTrust benchmarks.

    Data:
    - Aggregate Safety Score: ${model.aggregateScore}/100
    - Non-toxicity: ${model.safetyProfile.nonToxicity}/100
    - Non-stereotype: ${model.safetyProfile.nonStereotype}/100
    - Adversarial Robustness: ${model.safetyProfile.advRobustness}/100
    - OOD Robustness: ${model.safetyProfile.oodRobustness}/100
    - Adversarial Demo Robustness: ${model.safetyProfile.advDemoRobustness}/100
    - Privacy: ${model.safetyProfile.privacy}/100
    - Ethics: ${model.safetyProfile.ethics}/100
    - Fairness: ${model.safetyProfile.fairness}/100

    Provide a professional, data-driven safety analysis.
    Highlight safety strengths and the biggest risk areas.
    Keep tone objective and suitable for a scientific dashboard.
    Limit the response to 3 short paragraphs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Не удалось сгенерировать анализ.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Произошла ошибка при генерации анализа безопасности. Проверьте сеть или квоту API.";
  }
};
