import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type VaultDocument = {
  id: string;
  title: string;
  subject: string;
  pages: number;
  uploadedAt: number;
  color: string;
  chunks?: string[];
  sourceFile?: string;
  truncated?: boolean;
  chunkCount?: number;
};

export type ChatMessage = {
  id: string;
  documentId: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
};

export type MainsEvaluation = {
  id: string;
  question: string;
  imageUri: string | null;
  paper: "GS-1" | "GS-2" | "GS-3" | "GS-4" | "Essay";
  wordCount: number;
  scores: {
    structure: number;
    content: number;
    relevance: number;
    presentation: number;
    valueAddition: number;
  };
  totalScore: number;
  maxScore: number;
  feedback: string[];
  modelAnswerHint: string;
  createdAt: number;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  subtopic?: string;
};

export type QuizAttempt = {
  id: string;
  topic: string;
  source: "topic" | "pdf";
  questions: QuizQuestion[];
  answers: (number | null)[];
  score: number;
  durationSec: number;
  createdAt: number;
  completed: boolean;
};

export type TrackerNote = {
  id: string;
  title: string;
  content: string;
  subject: string;
  tags: string[];
  isStarred: boolean;
  imageUri?: string;
  createdAt: number;
};

export const CORE_SUBJECTS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Art & Culture",
  "Science & Tech",
];

export const OPTIONAL_SUBJECTS = [
  "History",
  "Public Administration",
  "Political Science & IR",
  "Sociology",
  "Psychology",
  "Philosophy",
  "Economics",
  "Anthropology",
  "Geography",
  "Agriculture",
  "Law",
  "Mathematics",
  "Physics",
  "Chemistry",
];

type AppState = {
  userName: string;
  setUserName: (name: string) => void;
  targetExam: string;
  setTargetExam: (s: string) => void;
  streakDays: number;
  bumpStreak: () => void;

  documents: VaultDocument[];
  addDocument: (d: Omit<VaultDocument, "id" | "uploadedAt">) => VaultDocument;
  removeDocument: (id: string) => void;

  chats: Record<string, ChatMessage[]>;
  addChatMessage: (
    msg: Omit<ChatMessage, "id" | "createdAt">,
  ) => ChatMessage;
  updateChatMessage: (
    documentId: string,
    messageId: string,
    patch: Partial<Pick<ChatMessage, "text">>,
  ) => void;

  evaluations: MainsEvaluation[];
  addEvaluation: (
    e: Omit<MainsEvaluation, "id" | "createdAt">,
  ) => MainsEvaluation;

  quizzes: QuizAttempt[];
  addQuiz: (q: Omit<QuizAttempt, "id" | "createdAt">) => QuizAttempt;
  updateQuiz: (id: string, patch: Partial<QuizAttempt>) => void;

  trackerNotes: TrackerNote[];
  addTrackerNote: (n: Omit<TrackerNote, "id" | "createdAt">) => TrackerNote;
  updateTrackerNote: (id: string, patch: Partial<TrackerNote>) => void;
  removeTrackerNote: (id: string) => void;

  optionalSubject: string | null;
  setOptionalSubject: (s: string | null) => void;
  customSubjects: string[];
  addCustomSubject: (s: string) => void;
  removeCustomSubject: (s: string) => void;

  hydrated: boolean;
};

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEY = "@prepassist/state-v1";
const ONBOARDING_KEY = "@prepassist/onboarded-v1";

const SUBJECT_COLORS = [
  "#4F39F6",
  "#06B6D4",
  "#F59E0B",
  "#EC4899",
  "#10B981",
  "#8B5CF6",
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const SEED_DOCS: VaultDocument[] = [
  {
    id: "seed-doc-1",
    title: "Indian Polity (Laxmikanth)",
    subject: "Polity",
    pages: 642,
    uploadedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
    color: SUBJECT_COLORS[0]!,
  },
  {
    id: "seed-doc-2",
    title: "Modern History — Spectrum",
    subject: "History",
    pages: 488,
    uploadedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    color: SUBJECT_COLORS[1]!,
  },
  {
    id: "seed-doc-3",
    title: "NCERT Geography Class XI",
    subject: "Geography",
    pages: 214,
    uploadedAt: Date.now() - 1000 * 60 * 60 * 18,
    color: SUBJECT_COLORS[2]!,
  },
];

const SEED_CHATS: Record<string, ChatMessage[]> = {
  "seed-doc-1": [
    {
      id: uid(),
      documentId: "seed-doc-1",
      role: "user",
      text: "Explain Article 32 in 3 lines.",
      createdAt: Date.now() - 1000 * 60 * 30,
    },
    {
      id: uid(),
      documentId: "seed-doc-1",
      role: "assistant",
      text: "Article 32 is the constitutional remedy that empowers any citizen to directly approach the Supreme Court when a Fundamental Right is violated. Dr. B. R. Ambedkar called it the 'heart and soul' of the Constitution. The Court can issue five writs — Habeas Corpus, Mandamus, Prohibition, Certiorari, and Quo Warranto — to enforce these rights.",
      createdAt: Date.now() - 1000 * 60 * 29,
    },
  ],
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [userName, setUserNameState] = useState("Aspirant");
  const [targetExam, setTargetExamState] = useState("UPSC CSE 2026");
  const [streakDays, setStreakDays] = useState(7);
  const [documents, setDocuments] = useState<VaultDocument[]>(SEED_DOCS);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>(SEED_CHATS);
  const [evaluations, setEvaluations] = useState<MainsEvaluation[]>([]);
  const [quizzes, setQuizzes] = useState<QuizAttempt[]>([]);
  const [trackerNotes, setTrackerNotes] = useState<TrackerNote[]>([]);
  const [optionalSubject, setOptionalSubjectState] = useState<string | null>(null);
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);

  // Hydrate from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.userName) setUserNameState(parsed.userName);
          if (parsed.targetExam) setTargetExamState(parsed.targetExam);
          if (typeof parsed.streakDays === "number")
            setStreakDays(parsed.streakDays);
          if (Array.isArray(parsed.documents) && parsed.documents.length)
            setDocuments(parsed.documents);
          if (parsed.chats && typeof parsed.chats === "object")
            setChats(parsed.chats);
          if (Array.isArray(parsed.evaluations))
            setEvaluations(parsed.evaluations);
          if (Array.isArray(parsed.quizzes)) setQuizzes(parsed.quizzes);
          if (Array.isArray(parsed.trackerNotes)) setTrackerNotes(parsed.trackerNotes);
          if (parsed.optionalSubject) setOptionalSubjectState(parsed.optionalSubject);
          if (Array.isArray(parsed.customSubjects)) setCustomSubjects(parsed.customSubjects);
        }
      } catch {
        // ignore - use defaults
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    const payload = {
      userName,
      targetExam,
      streakDays,
      documents,
      chats,
      evaluations,
      quizzes,
      trackerNotes,
      optionalSubject,
      customSubjects,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
  }, [
    hydrated,
    userName,
    targetExam,
    streakDays,
    documents,
    chats,
    evaluations,
    quizzes,
    trackerNotes,
    optionalSubject,
    customSubjects,
  ]);

  const setUserName = useCallback((name: string) => {
    setUserNameState(name.trim() || "Aspirant");
  }, []);

  const setTargetExam = useCallback((s: string) => {
    setTargetExamState(s.trim() || "UPSC CSE 2026");
  }, []);

  const bumpStreak = useCallback(() => {
    setStreakDays((d) => d + 1);
  }, []);

  const addDocument = useCallback<AppState["addDocument"]>((d) => {
    const doc: VaultDocument = {
      ...d,
      id: uid(),
      uploadedAt: Date.now(),
    };
    setDocuments((prev) => [doc, ...prev]);
    return doc;
  }, []);

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setChats((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const addChatMessage = useCallback<AppState["addChatMessage"]>((msg) => {
    const message: ChatMessage = {
      ...msg,
      id: uid(),
      createdAt: Date.now(),
    };
    setChats((prev) => {
      const list = prev[msg.documentId] ?? [];
      return { ...prev, [msg.documentId]: [...list, message] };
    });
    return message;
  }, []);

  const updateChatMessage = useCallback<AppState["updateChatMessage"]>(
    (documentId, messageId, patch) => {
      setChats((prev) => {
        const list = prev[documentId];
        if (!list) return prev;
        return {
          ...prev,
          [documentId]: list.map((m) =>
            m.id === messageId ? { ...m, ...patch } : m,
          ),
        };
      });
    },
    [],
  );

  const addEvaluation = useCallback<AppState["addEvaluation"]>((e) => {
    const evaluation: MainsEvaluation = {
      ...e,
      id: uid(),
      createdAt: Date.now(),
    };
    setEvaluations((prev) => [evaluation, ...prev]);
    return evaluation;
  }, []);

  const addQuiz = useCallback<AppState["addQuiz"]>((q) => {
    const quiz: QuizAttempt = {
      ...q,
      id: uid(),
      createdAt: Date.now(),
    };
    setQuizzes((prev) => [quiz, ...prev]);
    return quiz;
  }, []);

  const updateQuiz = useCallback<AppState["updateQuiz"]>((id, patch) => {
    setQuizzes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    );
  }, []);

  const addTrackerNote = useCallback<AppState["addTrackerNote"]>((n) => {
    const note: TrackerNote = { ...n, id: uid(), createdAt: Date.now() };
    setTrackerNotes((prev) => [note, ...prev]);
    return note;
  }, []);

  const updateTrackerNote = useCallback<AppState["updateTrackerNote"]>((id, patch) => {
    setTrackerNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const removeTrackerNote = useCallback((id: string) => {
    setTrackerNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const setOptionalSubject = useCallback((s: string | null) => {
    setOptionalSubjectState(s);
  }, []);

  const addCustomSubject = useCallback((s: string) => {
    setCustomSubjects((prev) => (prev.includes(s) ? prev : [...prev, s]));
  }, []);

  const removeCustomSubject = useCallback((s: string) => {
    setCustomSubjects((prev) => prev.filter((x) => x !== s));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      userName,
      setUserName,
      targetExam,
      setTargetExam,
      streakDays,
      bumpStreak,
      documents,
      addDocument,
      removeDocument,
      chats,
      addChatMessage,
      updateChatMessage,
      evaluations,
      addEvaluation,
      quizzes,
      addQuiz,
      updateQuiz,
      trackerNotes,
      addTrackerNote,
      updateTrackerNote,
      removeTrackerNote,
      optionalSubject,
      setOptionalSubject,
      customSubjects,
      addCustomSubject,
      removeCustomSubject,
      hydrated,
    }),
    [
      userName,
      setUserName,
      targetExam,
      setTargetExam,
      streakDays,
      bumpStreak,
      documents,
      addDocument,
      removeDocument,
      chats,
      addChatMessage,
      updateChatMessage,
      evaluations,
      addEvaluation,
      quizzes,
      addQuiz,
      updateQuiz,
      trackerNotes,
      addTrackerNote,
      updateTrackerNote,
      removeTrackerNote,
      optionalSubject,
      setOptionalSubject,
      customSubjects,
      addCustomSubject,
      removeCustomSubject,
      hydrated,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export const SUBJECT_PALETTE = SUBJECT_COLORS;
export { ONBOARDING_KEY };
