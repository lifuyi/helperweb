import { GoogleGenAI } from "@google/genai";
import { logger } from '../utils/logger.js';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateChatResponse = async (userMessage: string): Promise<string> => {
  if (!apiKey) {
    return "Demo Mode: API Key is missing. Please configure VITE_GEMINI_API_KEY to chat with the assistant.";
  }

  try {
    const model = "gemini-3-flash-preview";
    const systemInstruction = `You are a helpful travel assistant for "ChinaConnect", a service helping foreigners in China. 
    Your expertise is in:
    1. How to link international credit cards (Visa/Mastercard) to Alipay and WeChat Pay.
    2. Explaining why a VPN is needed in China (Great Firewall).
    3. General travel tips for China.
    
    Keep answers concise, friendly, and helpful. If they ask to buy something, guide them to the Pricing section.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: userMessage,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text || "I'm sorry, I couldn't generate a response at the moment.";
  } catch (error) {
    logger.error("Gemini API Error:", error);
    return "I'm having trouble connecting to the server right now. Please try again later.";
  }
};