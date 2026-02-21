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
    return "API Key not configured. Unable to generate analysis.";
  }

  const prompt = `
    Analyze the benchmark profile of the AI model "${model.name}" developed by ${model.developer}.

    The scores below are normalized to a 0-100 scale and sourced from the Open LLM Leaderboard.

    Data:
    - Aggregate Score: ${model.aggregateScore}/100
    - IFEval (instruction following): ${model.safetyProfile.ifeval}/100
    - BBH (Big-Bench Hard): ${model.safetyProfile.bbh}/100
    - MATH (level 5): ${model.safetyProfile.math}/100
    - GPQA: ${model.safetyProfile.gpqa}/100
    - MUSR: ${model.safetyProfile.musr}/100
    - MMLU-PRO: ${model.safetyProfile.mmluPro}/100

    Provide a professional, data-driven summary.
    Highlight strengths and the biggest gaps.
    Keep tone objective and suitable for a scientific dashboard.
    Limit the response to 3 short paragraphs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Analysis generation failed.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while generating the safety analysis. Please check your network or API quota.";
  }
};
