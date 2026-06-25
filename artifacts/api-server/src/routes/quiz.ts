import { Router, type IRouter } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";

const router: IRouter = Router();

// Configure multer for multipart/form-data parsing with 100MB limit
const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
});

function bufferToGenerativePart(buffer: Buffer, mimeType: string) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType,
        },
    };
}

function normalizeQuestions(rawQuestions: any[]): any[] {
  if (!Array.isArray(rawQuestions)) return [];
  
  return rawQuestions.map(q => {
    if (!q || typeof q !== 'object') return null;
    
    // 1. Normalize Question Text
    const questionText = q.questionText || q.question || q.text || q.question_text || "";
    
    // 2. Normalize Options
    let options = q.options || q.choices || q.answers || [];
    if (typeof options === 'object' && !Array.isArray(options)) {
      options = Object.entries(options).map(([id, text]) => ({ id, text }));
    }
    const normalizedOptions = Array.isArray(options) ? options.map((opt: any) => {
      if (typeof opt === 'string') {
        return { id: '', text: opt };
      }
      return {
        id: String(opt?.id || opt?.key || opt?.option || "").toLowerCase().trim(),
        text: String(opt?.text || opt?.value || opt?.content || "")
      };
    }) : [];
    
    normalizedOptions.forEach((opt, idx) => {
      if (!opt.id) {
        opt.id = String.fromCharCode(97 + idx); // a, b, c, d
      }
    });

    // 3. Normalize Correct Option ID
    let correctOptionId = String(q.correctOptionId || q.correctOption || q.correct_option || q.answer || q.correctAnswer || q.correct_answer || "").toLowerCase().trim();
    if (correctOptionId.length > 1) {
      const matchedOpt = normalizedOptions.find(o => o.text.toLowerCase() === correctOptionId.toLowerCase());
      if (matchedOpt) {
        correctOptionId = matchedOpt.id;
      } else {
        correctOptionId = correctOptionId.charAt(0);
      }
    }

    // 4. Normalize Explanation
    const explanation = q.explanation || q.desc || q.description || q.rationale || q.reason || "UPSC Academic Explanation.";

    return {
      questionText,
      options: normalizedOptions,
      correctOptionId,
      explanation
    };
  }).filter(q => q && q.questionText && q.options.length > 0);
}

// ── POST /quiz/process-pdf ────────────────────────────────────────────────
// Upload a PDF (multipart/form-data or json {pdfBase64}) and extract MCQs via Gemini 2.5
router.post("/process-pdf", upload.single("pdf"), async (req, res) => {
  try {
    let buffer: Buffer;
    let languageOption = "English";

    // Handle multipart/form-data vs application/json payload
    if (req.file) {
      buffer = req.file.buffer;
      if (req.body.language) languageOption = req.body.language;
    } else if (req.body.pdfBase64) {
      buffer = Buffer.from(req.body.pdfBase64, "base64");
      if (req.body.language) languageOption = req.body.language;
    } else {
      res.status(400).json({ error: "Missing PDF. Provide multipart 'pdf' or json 'pdfBase64'" });
      return;
    }

    req.log?.info({ size: buffer.length }, "quiz/process-pdf: starting gemini extraction");

    const googleKey = process.env.EXPO_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!googleKey) {
        res.status(500).json({ error: "Google API Key is not configured on the server." });
        return;
    }
    const genAI = new GoogleGenerativeAI(googleKey!);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const pdfPart = bufferToGenerativePart(buffer, "application/pdf");

    const prompt = `You are an expert UPSC instructor. I have uploaded a PDF document.
Your task is to analyze this PDF document and extract or generate Multiple-Choice Questions (MCQs) based on its contents.
Language: ${languageOption}.

You MUST strictly output a valid, parsable JSON Array matching this exact schema:
[
  {
    "questionText": "Question text goes here...",
    "options": [
      { "id": "a", "text": "Text for Option A" },
      { "id": "b", "text": "Text for Option B" },
      { "id": "c", "text": "Text for Option C" },
      { "id": "d", "text": "Text for Option D" }
    ],
    "correctOptionId": "a",
    "explanation": "Detailed, highly educational UPSC deep dive explanation explaining why the correct option is right and why others are wrong."
  }
]

Persona Rules:
1. Scan the document for pre-existing multiple-choice questions (MCQs). If you find pre-existing MCQs in the PDF, extract them exactly as written.
2. If the document does NOT contain pre-existing MCQs (e.g., it is a textbook chapter, study notes, or an article), you MUST dynamically generate 10 highly challenging, conceptual UPSC Prelims-style MCQs based strictly on the factual and analytical concepts presented in the text.
3. For each question (whether extracted or generated), formulate exactly 4 distinct options (a, b, c, d), specify the correctOptionId, and write a comprehensive, highly educational UPSC academic explanation.
4. Ensure the output is strictly a JSON array matching the schema, with absolutely no surrounding introductory or explanatory text.`;

    const result = await model.generateContent([prompt, pdfPart]);
    const response = await result.response;
    const aiText = response.text();

    let parsedData: any = null;
    try {
        parsedData = JSON.parse(aiText.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (err) {
        const match = aiText.match(/\[[\s\S]*\]/) || aiText.match(/\{[\s\S]*\}/);
        parsedData = match ? JSON.parse(match[0]) : null;
    }

    let finalResults: any[] = [];
    if (Array.isArray(parsedData)) {
       finalResults = parsedData;
    } else if (parsedData && typeof parsedData === 'object') {
       const foundArray = Object.values(parsedData).find(val => Array.isArray(val));
       finalResults = Array.isArray(foundArray) ? foundArray : [];
    }

    finalResults = normalizeQuestions(finalResults);

    if (finalResults.length < 1) {
      req.log?.warn("Failed to find MCQs. Snippet: " + aiText.substring(0, 1000));
      res.status(400).json({ 
        error: `No multiple-choice questions (MCQs) could be found or extracted from this PDF. Please ensure the document actually contains MCQs.\n\nModel Response Snippet: "${aiText.substring(0, 300)}..."` 
      });
      return;
    }
    
    req.log?.info({ extractedCount: finalResults.length }, "quiz/process-pdf: done");
    res.json({ results: finalResults });

  } catch (err: any) {
    req.log?.error({ err }, "quiz/process-pdf failed");
    res.status(500).json({ error: err.message || "Extraction failed" });
  }
});

export default router;
