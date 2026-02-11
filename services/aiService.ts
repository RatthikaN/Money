import { GoogleGenAI, Type } from "@google/genai";

/**
 * Helper to get a fresh instance of the AI client.
 * Uses the API key provided in the environment or the hardcoded fallback provided by the user.
 */
const getAiClient = () => {
  const apiKey = process.env.API_KEY || 'AIzaSyAxCel7eKGzV4tHFfL6xIz4GLRLERqUO_o';
  return new GoogleGenAI({ apiKey });
};

// Helper to clean JSON string if model adds markdown
const cleanJson = (text: string) => {
  if (!text) return "";
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const aiService = {
  /**
   * Simple check to see if AI is ready to use.
   */
  hasValidKey: (): boolean => {
    return !!(process.env.API_KEY || 'AIzaSyAxCel7eKGzV4tHFfL6xIz4GLRLERqUO_o');
  },

  /**
   * Extracts details from an invoice image using Gemini 3 Flash.
   */
  extractInvoiceDetails: async (base64Image: string, mimeType: string) => {
    try {
      const ai = getAiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            },
            {
              text: "Analyze this image. If it is an invoice or bill, extract: Shop/Vendor Name, Total Amount, Date, and itemized products. If it is not a bill, return null values."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shop: { type: Type.STRING, nullable: true },
              totalAmount: { type: Type.NUMBER, nullable: true },
              date: { type: Type.STRING, description: "YYYY-MM-DD format", nullable: true },
              taxType: { type: Type.STRING, enum: ["Inclusive", "Exclusive"], nullable: true },
              taxRate: { type: Type.NUMBER, nullable: true },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    product: { type: Type.STRING },
                    amount: { type: Type.NUMBER }
                  },
                  required: ["product", "amount"]
                }
              }
            }
          }
        }
      });

      const text = response.text;
      if (!text) return null;
      return JSON.parse(cleanJson(text));
    } catch (error: any) {
      console.error("AI Extraction Failed:", error);
      throw error;
    }
  },

  /**
   * Extracts business details from a GST certificate or registration document.
   */
  extractBusinessDetails: async (base64Image: string, mimeType: string) => {
    try {
      const ai = getAiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            },
            {
              text: "Analyze this GST certificate or business registration. Extract the Business Name, Address (City, State, Zip), and GST Number."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              companyName: { type: Type.STRING, description: "Legal Trade Name" },
              address: { type: Type.STRING, description: "Street address part" },
              city: { type: Type.STRING },
              state: { type: Type.STRING },
              zipCode: { type: Type.STRING },
              gstNumber: { type: Type.STRING, description: "GSTIN or Registration No" }
            }
          }
        }
      });

      const text = response.text;
      if (!text) return null;
      return JSON.parse(cleanJson(text));
    } catch (error: any) {
      console.error("GST Extraction Failed:", error);
      throw error;
    }
  },

  /**
   * Extracts client details from a business card or document.
   */
  extractClientDetails: async (base64Image: string, mimeType: string) => {
    try {
      const ai = getAiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            },
            {
              text: "Analyze this business card. Extract the Contact Person Name, Company Name, Email, Phone Number, GST Number, and Address details."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Contact person name" },
              companyName: { type: Type.STRING, description: "Business/Company name" },
              email: { type: Type.STRING },
              phoneNumber: { type: Type.STRING },
              gstNumber: { type: Type.STRING },
              address: { type: Type.STRING, description: "Street address" },
              city: { type: Type.STRING },
              state: { type: Type.STRING },
              zipCode: { type: Type.STRING }
            }
          }
        }
      });

      const text = response.text;
      if (!text) return null;
      return JSON.parse(cleanJson(text));
    } catch (error: any) {
      console.error("Client Extraction Failed:", error);
      throw error;
    }
  },

  /**
   * Generates financial insights based on provided data context.
   */
  generateInsights: async (data: any, context: 'Incoming' | 'Recurring' | 'Reports') => {
    try {
      const ai = getAiClient();

      const promptMap = {
        Incoming: "Analyze this list of recent incoming payments. Identify trends and top clients. Under 50 words.",
        Recurring: "Analyze these recurring items. Suggest one optimization. Under 50 words.",
        Reports: "Summarize this report with 3 key bullet points on financial health."
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Context: ${JSON.stringify(data)}. Task: ${promptMap[context]}`,
      });

      return response.text || "No insights generated.";
    } catch (error) {
      console.error("Insight Generation Failed:", error);
      return "Could not generate insights at this time.";
    }
  },

  /**
   * Chat with the data for the Assistant (Multi-turn)
   */
  chatWithData: async (userMessage: string, data: any, type: string, chatHistory: { role: 'user' | 'assistant', text: string }[] = []) => {
    try {
      const ai = getAiClient();

      const dataContext = JSON.stringify(data).slice(0, 50000);

      // Convert chat history to Gemini format if needed, or just append to prompt for context
      const historyContext = chatHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.text}`).join('\n');

      const prompt = `
        You are a smart financial assistant.
        The user is looking at "${type}" data:
        ${dataContext}

        PREVIOUS CONVERSATION:
        ${historyContext}

        USER QUESTION: "${userMessage}"

        INSTRUCTIONS:
        1. Answer based strictly on data and previous conversation context.
        2. Format money with symbols found in data.
        3. Keep answers concise.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      return response.text || "I'm not sure how to answer that.";
    } catch (error) {
      console.error("AI Chat Error:", error);
      return "I'm having trouble analyzing your data right now.";
    }
  }
};