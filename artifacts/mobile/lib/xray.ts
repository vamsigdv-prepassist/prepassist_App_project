import { GoogleGenerativeAI } from '@google/generative-ai';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function analyzeDocumentNatively(uri: string, mimeType: string, subject: string, userId: string) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || "";
  if (!apiKey) {
    throw new Error("Missing Google AI Credentials in environment variables. Please add EXPO_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // 1. Read file natively as base64
  const base64Data = await readAsStringAsync(uri, {
    encoding: "base64",
  });

  // 2. Extract text using Gemini Vision natively
  let extractedText = "";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = "Extract literally all textual data, words, numbers, and references exactly as written from this document or image. Provide only the raw transcription.";
    
    const config = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };
    
    const result = await model.generateContent([{ text: prompt }, config]);
    extractedText = result.response.text();
  } catch (e) {
    console.error("Native Extraction Error:", e);
    throw new Error("Failed to extract text from the provided document.");
  }

  if (!extractedText || extractedText.length < 20) {
    throw new Error("No meaningful text could be extracted from this document.");
  }

  // 3. Synthesize the response purely via LLM
  const agentPrompt = `
    I have just submitted a parsed document to you relating to ${subject}.
    Extracted Document Text:
    "${extractedText.substring(0, 3000)}"
    
    Using the "UPSC Master Mentor" methodology:
    Analyze this text strictly from a UPSC Civil Services perspective.
    1. Formulate your response using standard 'Intro-Body-Conclusion' flow.
    
    You MUST output EXACTLY raw parseable JSON strictly using this format, and absolutely nothing else.
    IMPORTANT: DO NOT USE NESTED JSON OBJECTS. Write highly readable, plain-text paragraphs or markdown bullet points natively inside these 5 exact string fields:
    {
      "deep_dive": "Write detailed, fully readable paragraphs here...",
      "current_affairs": "Write your readable notes here...",
      "prelims_practice": "...",
      "history": "...",
      "references": "..."
    }
  `;

  const modelOptions = { 
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
    systemInstruction: `You are the absolute UPSC Master Mentor for ${subject}. 
    Your goal is to assist aspirants with conceptual clarity and current affairs integration natively.
    Core Persona Rules:
    - Map perfectly to GS Papers.
    - Provide analytical & objective viewpoints.
    - NEVER use conversational filler. OUTPUT ONLY flat JSON strings for the 5 requested keys. Do not nest objects.`
  };

  const model2 = genAI.getGenerativeModel(modelOptions);
  const result2 = await model2.generateContent(agentPrompt);
  const responseText = result2.response.text().trim();
  
  let crewPayload;
  try {
    crewPayload = JSON.parse(responseText);
  } catch(e) {
    console.error("JSON Parse Error. Raw Output:", responseText);
    throw new Error("Generative Engine failed to structure JSON natively.");
  }
  
  const enforceString = (val: any): string => {
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.map(v => enforceString(v)).join('\n\n');
    if (typeof val === 'object' && val !== null) {
      return Object.entries(val).map(([k, v]) => `**${k.toUpperCase().replace(/_/g, ' ')}**\n${enforceString(v)}`).join('\n\n');
    }
    return String(val || "");
  };
  
  const enforcedPayload = {
    deep_dive: enforceString(crewPayload.deep_dive),
    current_affairs: enforceString(crewPayload.current_affairs),
    prelims_practice: enforceString(crewPayload.prelims_practice),
    history: enforceString(crewPayload.history),
    references: enforceString(crewPayload.references)
  };

  // 4. Save to Firebase History
  try {
    await addDoc(collection(db, "users", userId, "xray_history"), {
      subject: subject,
      sentenceExtracted: extractedText.substring(0, 150) + "...",
      matchFound: false,
      payload: enforcedPayload,
      createdAt: serverTimestamp()
    });
  } catch(err) {
    console.error("Firebase History Push Error:", err);
  }

  return {
    match: false, 
    similarity: 0,
    ...enforcedPayload
  };
}
