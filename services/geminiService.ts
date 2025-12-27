
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { BookMetadata, GroundingSource } from "../types";

// Always initialize GoogleGenAI with the API key from process.env.API_KEY directly.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Extracts book metadata from a PDF (via its first few pages as base64 images)
 */
export const extractBookMetadata = async (imageParts: { inlineData: { data: string, mimeType: string } }[]): Promise<BookMetadata> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        ...imageParts,
        { text: "Analyze these images from a PDF ebook and provide the book's Name, Authors, Theme, and a concise 2-sentence Summary. Return valid JSON." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          authors: { type: Type.ARRAY, items: { type: Type.STRING } },
          theme: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ["name", "authors", "theme", "summary"]
      }
    }
  });

  // Extract text property directly.
  return JSON.parse(response.text || '{}') as BookMetadata;
};

/**
 * Uses Google Search to find more info about a book or author
 */
export const researchTopic = async (query: string): Promise<{ text: string, sources: GroundingSource[] }> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Tell me more about: ${query}`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  // Extract grounding metadata from chunks for Google Search tools.
  const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title,
      uri: chunk.web.uri
    })) || [];

  return {
    text: response.text || "No information found.",
    sources
  };
};

/**
 * Edits an image (like a book cover) using text prompts
 */
export const editBookCover = async (base64Image: string, prompt: string): Promise<string | null> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image.split(',')[1],
            mimeType: "image/png"
          }
        },
        { text: prompt }
      ]
    }
  });

  // Iterate through all parts to find the image part, as text might also be present.
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};
