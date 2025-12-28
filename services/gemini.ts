
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generatePostDraft = async (topic: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Draft a social media post for VoxSpace (a community platform) about: ${topic}. Keep it engaging and concise, under 280 characters. Include relevant hashtags.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Post Draft Error:", error);
    return "Error generating draft. Please try again.";
  }
};

export const suggestInterests = async (input: string) => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on the user's interest in "${input}", suggest 5 relevant sub-categories or hashtags for a social discovery feed.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                }
            }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Gemini Suggestion Error:", error);
      return [];
    }
}
