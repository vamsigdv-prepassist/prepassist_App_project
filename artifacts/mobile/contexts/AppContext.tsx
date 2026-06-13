import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { AppState } from "react-native";

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
  sourceUrl?: string;
  createdAt: number;
  cloudId?: string;
  lastSyncedAt?: number;
  mergedSources?: any[];
  hasUpdates?: boolean;
  updatesList?: any[];
  ignoredUpdateIds?: string[];
};

export type SavedArticle = {
  id: string;
  url: string;
  title: string;
  savedAt: number;
  content?: string;
  extractedAt?: number;
  noteIds?: string[];
};

export type CalendarTask = {
  id: string;
  title: string;
  subject: string;
  dateStr: string; // YYYY-MM-DD
  color: string;
};

export type MindmapNode = {
  title: string;
  children?: MindmapNode[];
};

export type UserMindmap = {
  id: string;
  topic: string;
  mapData: MindmapNode;
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

  savedArticles: SavedArticle[];
  addSavedArticle: (a: Omit<SavedArticle, "id" | "savedAt">) => SavedArticle;
  updateSavedArticle: (id: string, patch: Partial<SavedArticle>) => void;
  removeSavedArticle: (id: string) => void;

  optionalSubject: string | null;
  setOptionalSubject: (s: string | null) => void;
  customSubjects: string[];
  addCustomSubject: (s: string) => void;
  removeCustomSubject: (s: string) => void;

  calendarTasks: CalendarTask[];
  addCalendarTask: (t: Omit<CalendarTask, "id">) => CalendarTask;
  removeCalendarTask: (id: string) => void;

  mindmaps: UserMindmap[];
  addMindmap: (topic: string, mapData: MindmapNode) => UserMindmap;
  removeMindmap: (id: string) => void;

  weeklyStudyData: { dateStr: string, studyMinutes: number }[];
  hydrated: boolean;
};

const AppContext = createContext<AppState | null>(null);

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

import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  fetchUserQuizzes, 
  fetchUserMindmaps, 
  fetchUserNotes, 
  subscribeUserNotes,
  fetchUserArticles, 
  fetchUserChats,
  subscribeUserChats,
  fetchUserEvaluations,
  saveTrackerNote,
  saveArticleDb,
  deleteSavedArticleDb,
  saveMindmapDb,
  deleteMindmapDb,
  saveUserEvaluation,
  deleteUserEvaluation,
  saveUserQuiz,
  deleteUserQuiz,
  fetchWeeklyStudyData,
  incrementStudyMinute
} from "../lib/sync";

export const ONBOARDING_KEY = "@prepassist/onboarded-v1";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [userName, setUserNameState] = useState("Aspirant");
  const [targetExam, setTargetExamState] = useState("UPSC CSE 2026");
  const [streakDays, setStreakDays] = useState(7);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [evaluations, setEvaluations] = useState<MainsEvaluation[]>([]);
  const [quizzes, setQuizzes] = useState<QuizAttempt[]>([]);
  const [trackerNotes, setTrackerNotes] = useState<TrackerNote[]>([]);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [optionalSubject, setOptionalSubjectState] = useState<string | null>(null);
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);
  const [mindmaps, setMindmaps] = useState<UserMindmap[]>([]);
  const [weeklyStudyData, setWeeklyStudyData] = useState<{ dateStr: string, studyMinutes: number }[]>([]);

  // Hydrate from Firebase securely based on Auth state
  useEffect(() => {
    let unsubscribeNotes: (() => void) | undefined;
    let unsubscribeChats: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserNameState(user.displayName || "Aspirant");
        
        // Start real-time listeners for Notes and RAG pipeline
        unsubscribeNotes = subscribeUserNotes(user.uid, (notesData) => {
          setTrackerNotes(notesData);
        });
        unsubscribeChats = subscribeUserChats(user.uid, (chatsData) => {
          setDocuments(chatsData.docs);
          setChats(chatsData.chats);
        });

        try {
          const [
            quizzesData,
            mindmapsData,
            articlesData,
            evaluationsData,
            studyData
          ] = await Promise.all([
            fetchUserQuizzes(user.uid),
            fetchUserMindmaps(user.uid),
            fetchUserArticles(user.uid),
            fetchUserEvaluations(user.uid),
            fetchWeeklyStudyData(user.uid)
          ]);

          setQuizzes(quizzesData);
          setMindmaps(mindmapsData);
          setSavedArticles(articlesData);
          setEvaluations(evaluationsData);
          setWeeklyStudyData(studyData);
        } catch (error) {
          console.error("Firebase sync failed:", error);
        }
      } else {
        if (unsubscribeNotes) unsubscribeNotes();
        if (unsubscribeChats) unsubscribeChats();
        
        // Clear state on logout
        setDocuments([]);
        setChats({});
        setEvaluations([]);
        setQuizzes([]);
        setTrackerNotes([]);
        setSavedArticles([]);
        setCalendarTasks([]);
        setMindmaps([]);
        setWeeklyStudyData([]);
      }
      setHydrated(true);
    });

    return () => unsubscribe();
  }, []);

  // Study Tracker hook
  const activeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const handleStateChange = (nextState: string) => {
      if (nextState === "active" && auth.currentUser) {
        if (!activeIntervalRef.current) {
          activeIntervalRef.current = setInterval(() => {
            // Increment remote
            if (auth.currentUser) {
              incrementStudyMinute(auth.currentUser.uid);
            }
            // Increment local state optimistically
            const today = new Date();
            const dateStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
            setWeeklyStudyData(prev => {
              const existing = prev.find(d => d.dateStr === dateStr);
              if (existing) {
                return prev.map(d => d.dateStr === dateStr ? { ...d, studyMinutes: d.studyMinutes + 1 } : d);
              }
              return [{ dateStr, studyMinutes: 1 }, ...prev];
            });
          }, 60000);
        }
      } else {
        if (activeIntervalRef.current) {
          clearInterval(activeIntervalRef.current);
          activeIntervalRef.current = null;
        }
      }
    };

    // Initialize if active immediately
    handleStateChange(AppState.currentState);
    
    const subscription = AppState.addEventListener("change", handleStateChange);
    return () => {
      subscription.remove();
      if (activeIntervalRef.current) {
        clearInterval(activeIntervalRef.current);
      }
    };
  }, []);

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
    setEvaluations((prev) => {
      const next = [evaluation, ...prev];
      if (next.length > 7) {
        const toDelete = next.slice(7);
        if (auth.currentUser) {
          toDelete.forEach(d => deleteUserEvaluation(d.id, auth.currentUser!.uid));
        }
        return next.slice(0, 7);
      }
      return next;
    });

    if (auth.currentUser) {
      saveUserEvaluation(evaluation, auth.currentUser.uid).catch(err => {
        console.error("Failed to auto-sync evaluation to cloud:", err);
      });
    }

    return evaluation;
  }, []);

  const addQuiz = useCallback<AppState["addQuiz"]>((q) => {
    const quiz: QuizAttempt = {
      ...q,
      id: uid(),
      createdAt: Date.now(),
    };
    setQuizzes((prev) => {
      const next = [quiz, ...prev];
      if (next.length > 7) {
        const toDelete = next.slice(7);
        if (auth.currentUser) {
          toDelete.forEach(d => deleteUserQuiz(d.id));
        }
        return next.slice(0, 7);
      }
      return next;
    });
    return quiz;
  }, []);

  const updateQuiz = useCallback<AppState["updateQuiz"]>((id, patch) => {
    setQuizzes((prev) => {
      const next = prev.map((q) => (q.id === id ? { ...q, ...patch } : q));
      if (patch.completed) {
        const updated = next.find(q => q.id === id);
        if (updated && auth.currentUser) {
          saveUserQuiz(updated, auth.currentUser.uid).catch(err => {
            console.error("Failed to sync quiz to cloud:", err);
          });
        }
      }
      return next;
    });
  }, []);

  const addTrackerNote = useCallback<AppState["addTrackerNote"]>((n) => {
    const noteId = "mobile_" + uid();
    const note: TrackerNote = { ...n, id: noteId, createdAt: Date.now() };
    setTrackerNotes((prev) => [note, ...prev]);

    return note;
  }, []);

  const updateTrackerNote = useCallback<AppState["updateTrackerNote"]>((id, patch) => {
    setTrackerNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const removeTrackerNote = useCallback((id: string) => {
    setTrackerNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addSavedArticle = useCallback<AppState["addSavedArticle"]>((a) => {
    const article: SavedArticle = { ...a, id: uid(), savedAt: Date.now() };
    setSavedArticles((prev) => [article, ...prev]);

    if (auth.currentUser) {
      saveArticleDb(article, auth.currentUser.uid).catch(err => console.error("Failed to sync article:", err));
    }

    return article;
  }, []);

  const updateSavedArticle = useCallback<AppState["updateSavedArticle"]>((id, patch) => {
    setSavedArticles((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      const updatedArticle = next.find(a => a.id === id);
      if (updatedArticle && auth.currentUser) {
        saveArticleDb(updatedArticle, auth.currentUser.uid).catch(err => console.error("Failed to sync updated article:", err));
      }
      return next;
    });
  }, []);

  const removeSavedArticle = useCallback((id: string) => {
    setSavedArticles((prev) => prev.filter((a) => a.id !== id));
    deleteSavedArticleDb(id).catch(err => console.error("Failed to delete article db:", err));
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

  const addCalendarTask = useCallback<AppState["addCalendarTask"]>((t) => {
    const task: CalendarTask = { ...t, id: uid() };
    setCalendarTasks((prev) => [...prev, task]);
    return task;
  }, []);

  const removeCalendarTask = useCallback((id: string) => {
    setCalendarTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addMindmap = useCallback<AppState["addMindmap"]>((topic, mapData) => {
    const map: UserMindmap = { id: uid(), topic, mapData, createdAt: Date.now() };
    setMindmaps((prev) => [map, ...prev]);

    if (auth.currentUser) {
      saveMindmapDb(map, auth.currentUser.uid).catch(err => console.error("Failed to sync mindmap:", err));
    }

    return map;
  }, []);

  const removeMindmap = useCallback((id: string) => {
    setMindmaps((prev) => prev.filter((m) => m.id !== id));
    deleteMindmapDb(id).catch(err => console.error("Failed to delete mindmap:", err));
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
      savedArticles,
      addSavedArticle,
      updateSavedArticle,
      removeSavedArticle,
      optionalSubject,
      setOptionalSubject,
      customSubjects,
      addCustomSubject,
      removeCustomSubject,
      calendarTasks,
      addCalendarTask,
      removeCalendarTask,
      mindmaps,
      addMindmap,
      removeMindmap,
      weeklyStudyData,
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
      savedArticles,
      addSavedArticle,
      updateSavedArticle,
      removeSavedArticle,
      optionalSubject,
      setOptionalSubject,
      customSubjects,
      addCustomSubject,
      removeCustomSubject,
      calendarTasks,
      addCalendarTask,
      removeCalendarTask,
      mindmaps,
      addMindmap,
      removeMindmap,
      weeklyStudyData,
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
