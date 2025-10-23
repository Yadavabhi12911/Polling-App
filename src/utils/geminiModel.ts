import { GoogleGenAI } from "@google/genai";


const apiKey = import.meta.env.VITE_GEMINI_API_KEY

const ai = new GoogleGenAI({apiKey});


export async function main(prompt: string) {
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain how AI works in a 50 words",
  });
  
  return response.text
}




