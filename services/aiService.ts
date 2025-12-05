
import { GoogleGenAI, Schema, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to clean JSON string if model adds markdown
const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const aiService = {
  /**
   * Extracts details from an invoice image.
   */
  extractInvoiceDetails: async (base64Image: string, mimeType: string) => {
    if (!apiKey) {
      console.warn("No API Key found for Gemini");
      return null;
    }

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
              text: "Extract the following details from this invoice/bill image: Client/Payer Name, Total Amount, Date of Invoice, Invoice/Transaction Number. Return a JSON object."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              client: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING, description: "YYYY-MM-DD format" },
              transactionNo: { type: Type.STRING },
              paymentType: { type: Type.STRING, description: "Brief description of service/product" }
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
   * Generates financial insights based on provided data context.
   */
  generateInsights: async (data: any, context: 'Incoming' | 'Recurring' | 'Reports') => {
    if (!apiKey) return "AI Insights unavailable (Missing API Key).";

    try {
      const promptMap = {
        Incoming: "Analyze this list of recent incoming payments. Identify the top client, payment consistency trends, and any cash flow observations. Keep it under 50 words.",
        Recurring: "Analyze these recurring expenses/income. Calculate the total monthly burn rate vs income. Suggest one optimization. Keep it under 50 words.",
        Reports: "Act as a financial auditor. Summarize this report data into an executive summary with 3 bullet points highlighting risks and opportunities."
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Context: ${JSON.stringify(data)}. Task: ${promptMap[context]}`
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
    if (!apiKey) return "I can't access my brain right now (API Key missing).";

    try {
      // We slice the data to ensure we don't accidentally exceed massive token limits if mock data grows huge,
      // though Gemini Flash has a very large context window.
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
        5. Format money with $ symbols.
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
