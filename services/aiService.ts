
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client
// The APIkey must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean JSON string if model adds markdown
const cleanJson = (text: string) => {
  if (!text) return "";
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const aiService = {
  /**
   * Extracts details from an invoice image using Gemini 2.5 Flash.
   */
  extractInvoiceDetails: async (base64Image: string, mimeType: string) => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            },
            {
              text: "Analyze this image. If it is an invoice or bill, extract: Client/Payer Name, Total Amount, Date, and Invoice Number. If it is not a bill, return null values."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          // Disable thinking for faster latency on simple extraction tasks
          thinkingConfig: { thinkingBudget: 0 },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              client: { type: Type.STRING, nullable: true },
              amount: { type: Type.NUMBER, nullable: true },
              date: { type: Type.STRING, description: "YYYY-MM-DD format", nullable: true },
              transactionNo: { type: Type.STRING, nullable: true },
              paymentType: { type: Type.STRING, description: "Brief description of service/product", nullable: true }
            }
          }
        }
      });

      const text = response.text;
      if (!text) return null;
      return JSON.parse(cleanJson(text));
    } catch (error) {
      console.error("AI Extraction Failed:", error);
      throw error;
    }
  },

  /**
   * Extracts business details from a GST certificate or registration document.
   */
  extractBusinessDetails: async (base64Image: string, mimeType: string) => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            },
            {
              text: "Analyze this image. It is a GST certificate or business registration document. Extract the Business Name, Complete Address components (City, State, Zip), and GST/Registration Number."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
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
    } catch (error) {
      console.error("GST Extraction Failed:", error);
      throw error;
    }
  },

  /**
   * Generates financial insights based on provided data context.
   */
  generateInsights: async (data: any, context: 'Incoming' | 'Recurring' | 'Reports') => {
    try {
      const promptMap = {
        Incoming: "Analyze this list of recent incoming payments. Identify the top client, payment consistency trends, and any cash flow observations. Keep it under 50 words.",
        Recurring: "Analyze these recurring expenses/income. Calculate the total monthly burn rate vs income. Suggest one optimization. Keep it under 50 words.",
        Reports: "Act as a financial auditor. Summarize this report data into an executive summary with 3 bullet points highlighting risks and opportunities."
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Context: ${JSON.stringify(data)}. Task: ${promptMap[context]}`,
        config: {
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      return response.text || "No insights generated.";
    } catch (error) {
      console.error("Insight Generation Failed:", error);
      return "Could not generate insights at this time.";
    }
  },

  /**
   * Chat with the data for the Assistant
   */
  chatWithData: async (userMessage: string, data: any, type: string) => {
    try {
      // Limit context size strictly to avoid token issues
      const dataContext = JSON.stringify(data).slice(0, 50000); 

      const prompt = `
        You are a smart, helpful financial assistant embedded in a money management app.
        
        CONTEXT:
        The user is currently looking at the "${type}" page.
        Here is the raw JSON data visible to the user:
        ${dataContext}

        USER QUESTION:
        "${userMessage}"

        INSTRUCTIONS:
        1. Answer the user's question based strictly on the provided data.
        2. If the data doesn't contain the answer, politely say so.
        3. Perform calculations if asked (e.g., "Total spent on Amazon").
        4. Keep your answer concise, friendly, and professional.
        5. Format money with $ or the appropriate currency symbol found in data.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return response.text || "I'm not sure how to answer that.";
    } catch (error) {
      console.error("AI Chat Error:", error);
      return "I'm having trouble analyzing your data right now. Please try again later.";
    }
  }
};
