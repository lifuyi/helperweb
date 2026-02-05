// services/geminiService.ts
import { GoogleGenAI } from "@google/genai";

// utils/logger.ts
var isDevelopment = false;
var logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  }
};

// services/geminiService.ts
var apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
var ai = new GoogleGenAI({ apiKey });
var generateChatResponse = async (userMessage) => {
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
      model,
      contents: userMessage,
      config: {
        systemInstruction
      }
    });
    return response.text || "I'm sorry, I couldn't generate a response at the moment.";
  } catch (error) {
    logger.error("Gemini API Error:", error);
    return "I'm having trouble connecting to the server right now. Please try again later.";
  }
};
export {
  generateChatResponse
};
