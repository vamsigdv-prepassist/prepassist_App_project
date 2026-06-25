import { collection, getDocs, query, orderBy, where, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import {
  VaultDocument,
  ChatMessage,
  QuizAttempt,
  TrackerNote,
  SavedArticle,
  UserMindmap,
  MainsEvaluation
} from "../contexts/AppContext";

export interface MainsQuestion {
  id?: string;
  topic: string;
  questionText: string;
  modelAnswer: string;
  language: "English" | "Hindi";
  createdAt: number;
}

// Note: test-main collections:
// - Quiz attempts: `quiz_results` (where userId == uid)
// - Mindmaps: `users/{uid}/mindmaps`
// - Notes: `users/{uid}/notes`
// - Saved Articles: `users/{uid}/saved_articles`
// - RAG history / Documents: `users/{uid}/rag_notes` (We map this to chats)
// - Mains evaluations: No explicit user evaluations collection in test-main's lib, so we'll fallback to `users/{uid}/evaluations` if needed.

export async function fetchUserQuizzes(userId: string): Promise<QuizAttempt[]> {
  try {
    const q = query(collection(db, "quiz_results"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const results: any[] = [];
    snap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
    return results.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).map(r => ({
      id: r.id,
      topic: r.topic || "Quiz",
      source: r.source || "topic",
      questions: r.questions || [],
      answers: r.answers || [],
      score: r.correctAnswers || r.score || 0,
      durationSec: r.durationSec || 0,
      createdAt: r.timestamp?.toMillis ? r.timestamp.toMillis() : Date.now(),
      completed: true,
    }));
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return [];
  }
}

export async function fetchUserMindmaps(userId: string): Promise<UserMindmap[]> {
  try {
    const q = query(collection(db, "users", userId, "mindmaps"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        topic: data.topic,
        mapData: data.mapData || data.data || { title: data.topic },
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now()
      };
    }) as UserMindmap[];
  } catch (error) {
    console.error("Error fetching mindmaps:", error);
    return [];
  }
}

export async function fetchUserEvaluations(userId: string): Promise<MainsEvaluation[]> {
  try {
    const q = query(collection(db, "users", userId, "evaluations"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt || Date.now()
      } as MainsEvaluation;
    });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return [];
  }
}

export async function saveUserEvaluation(evaluation: MainsEvaluation, userId: string): Promise<void> {
  try {
    const docRef = doc(db, "users", userId, "evaluations", evaluation.id);
    await setDoc(docRef, evaluation);
  } catch (error) {
    console.error("Failed to save evaluation to Firebase:", error);
  }
}

export async function deleteUserEvaluation(evaluationId: string, userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", userId, "evaluations", evaluationId));
  } catch (error) {
    console.error("Failed to delete evaluation from Firebase:", error);
  }
}

export async function saveUserQuiz(quiz: QuizAttempt, userId: string): Promise<void> {
  try {
    const payload = {
      ...quiz,
      userId,
      timestamp: { seconds: Math.floor(quiz.createdAt / 1000) }
    };
    await setDoc(doc(db, "quiz_results", quiz.id), payload);
  } catch (error) {
    console.error("Failed to save quiz to Firebase:", error);
  }
}

export async function deleteUserQuiz(quizId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "quiz_results", quizId));
  } catch (error) {
    console.error("Failed to delete quiz from Firebase:", error);
  }
}

export async function fetchUserNotes(userId: string): Promise<TrackerNote[]> {
  try {
    const q = query(collection(db, "cloud_notes"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const existing: TrackerNote[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.isStaged) return; // Ignore Staged (Raw) Notes

      existing.push({
        id: docSnap.id,
        title: data.title || "Untitled",
        content: data.content || "",
        subject: data.subject || "Uncategorized",
        tags: data.tags || [],
        isStarred: data.is_starred || false,
        imageUri: data.fileUrl || undefined,
        createdAt: data.createdAt || Date.now(),
        cloudId: docSnap.id,
        isStaged: data.isStaged || false,
        hasUpdates: data.hasUpdates || false,
        updatesList: data.updatesList || [],
        ignoredUpdateIds: data.ignoredUpdateIds || [],
        mergedSources: data.mergedSources || []
      });
    });
    return existing.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Failed to fetch cloud_notes:", error);
    return [];
  }
}

export function subscribeUserNotes(userId: string, callback: (notes: TrackerNote[]) => void): (() => void) {
  const q = query(collection(db, "cloud_notes"), where("userId", "==", userId));
  return onSnapshot(q, (snap) => {
    const existing: TrackerNote[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.isStaged) return; // Ignore Staged (Raw) Notes
      
      existing.push({
        id: docSnap.id,
        title: data.title || "Untitled",
        content: data.content || "",
        subject: data.subject || "Uncategorized",
        tags: data.tags || [],
        isStarred: data.is_starred || false,
        imageUri: data.fileUrl || undefined,
        createdAt: data.createdAt || Date.now(),
        cloudId: docSnap.id,
        isStaged: data.isStaged || false,
        hasUpdates: data.hasUpdates || false,
        updatesList: data.updatesList || [],
        ignoredUpdateIds: data.ignoredUpdateIds || [],
        mergedSources: data.mergedSources || []
      });
    });
    callback(existing.sort((a, b) => b.createdAt - a.createdAt));
  }, (error) => {
    console.error("Failed to subscribe cloud_notes:", error);
  });
}

export async function saveTrackerNote(note: TrackerNote, userId: string): Promise<void> {
  try {
    const CORE_SUBJECTS = [
      "History", "Polity", "Geography", "Economy", "Environment", 
      "Science & Tech", "Art & Culture", "Ethics", "Current Affairs", "Governance"
    ];
    const categoryType = CORE_SUBJECTS.includes(note.subject) ? 'core' : 'other';
    
    const payload = {
      id: note.id,
      userId: userId,
      title: note.title,
      subject: note.subject,
      categoryType: categoryType,
      type: "url",
      sourceUrl: note.sourceUrl || "",
      content: note.content,
      tags: note.tags || [],
      createdAt: note.createdAt || Date.now(),
      isVerified: false,
      hasUpdates: false
    };

    await setDoc(doc(db, "cloud_notes", note.id), payload);
  } catch (error) {
    console.error("Error saving to cloud_notes:", error);
  }
}

export async function fetchUserArticles(userId: string): Promise<SavedArticle[]> {
  try {
    const q = query(collection(db, "saved_websites"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const existing: SavedArticle[] = [];
    snap.docs.forEach((doc) => {
      const data = doc.data();
      existing.push({
        id: doc.id,
        title: data.title || data.domain || "Article",
        url: data.url || "",
        savedAt: data.dateAdded || Date.now(),
        content: data.content,
        extractedAt: data.extractedAt
      });
    });
    return existing.sort((a, b) => b.savedAt - a.savedAt);
  } catch (error) {
    console.error("Error fetching articles:", error);
    return [];
  }
}

export async function saveArticleDb(article: SavedArticle, userId: string): Promise<void> {
  try {
    const payload = {
      userId,
      title: article.title,
      url: article.url,
      dateAdded: article.savedAt,
      content: article.content || null,
      extractedAt: article.extractedAt || null
    };
    await setDoc(doc(db, "saved_websites", article.id), payload, { merge: true });
  } catch (error) {
    console.error("Error saving article:", error);
  }
}

export async function deleteSavedArticleDb(articleId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "saved_websites", articleId));
  } catch (error) {
    console.error("Error deleting article:", error);
  }
}

export async function fetchUserChats(userId: string): Promise<{ docs: VaultDocument[], chats: Record<string, ChatMessage[]> }> {
  try {
    const q = query(collection(db, "users", userId, "rag_notes"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    
    // Convert RAG history into VaultDocuments and ChatMessages
    const docs: VaultDocument[] = [];
    const chats: Record<string, ChatMessage[]> = {};
    
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const docId = data.documentId || "global-rag";
      
      if (!chats[docId]) {
        chats[docId] = [];
        if (docId !== "global-rag") {
          docs.push({
            id: docId,
            title: data.documentName || "Scanned Document",
            subject: "Vault",
            pages: 1,
            uploadedAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
            color: "#4F39F6"
          });
        }
      }
      
      const time = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
      
      if (data.query) {
        chats[docId].push({
          id: docSnap.id + "_q",
          documentId: docId,
          role: "user",
          text: data.query,
          createdAt: time - 1000
        });
      }
      
      if (data.answer) {
        chats[docId].push({
          id: docSnap.id + "_a",
          documentId: docId,
          role: "assistant",
          text: data.answer,
          createdAt: time
        });
      }
    });
    
    return { docs, chats };
  } catch (error) {
    console.error("Error fetching RAG history:", error);
    return { docs: [], chats: {} };
  }
}

export function subscribeUserChats(
  userId: string, 
  callback: (data: { docs: VaultDocument[], chats: Record<string, ChatMessage[]> }) => void
): (() => void) {
  const q = query(collection(db, "users", userId, "rag_notes"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const docs: VaultDocument[] = [];
    const chats: Record<string, ChatMessage[]> = {};
    
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const docId = data.documentId || "global-rag";
      
      if (!chats[docId]) {
        chats[docId] = [];
        if (docId !== "global-rag") {
          docs.push({
            id: docId,
            title: data.documentName || "Scanned Document",
            subject: "Vault",
            pages: 1,
            uploadedAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
            color: "#4F39F6"
          });
        }
      }
      
      const time = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
      
      if (data.query) {
        chats[docId].push({
          id: docSnap.id + "_q",
          documentId: docId,
          role: "user",
          text: data.query,
          createdAt: time - 1000
        });
      }
      
      if (data.answer) {
        chats[docId].push({
          id: docSnap.id + "_a",
          documentId: docId,
          role: "assistant",
          text: data.answer,
          createdAt: time
        });
      }
    });
    
    callback({ docs, chats });
  }, (error) => {
    console.error("Error subscribing RAG history:", error);
  });
}

export async function fetchMainsQuestions(language: "English" | "Hindi"): Promise<MainsQuestion[]> {
  try {
    const q = query(
      collection(db, "mains_questions"),
      where("language", "==", language)
    );
    const snap = await getDocs(q);
    
    const questions = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now()
      };
    }) as MainsQuestion[];
    
    return questions.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Crash executing Mains Question logic fetching:", error);
    return [];
  }
}

export async function saveMindmapDb(mindmap: UserMindmap, userId: string): Promise<void> {
  try {
    const payload = {
      userId,
      topic: mindmap.topic,
      mapData: mindmap.mapData,
      createdAt: mindmap.createdAt || Date.now(),
    };
    await setDoc(doc(db, "mindmaps", mindmap.id), payload, { merge: true });
  } catch (error) {
    console.error("Error saving mindmap:", error);
  }
}

export async function deleteMindmapDb(mindmapId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "mindmaps", mindmapId));
  } catch (error) {
    console.error("Error deleting mindmap:", error);
  }
}

export async function incrementStudyMinute(userId: string): Promise<void> {
  try {
    const { increment } = await import("firebase/firestore");
    const today = new Date();
    // Use local YYYY-MM-DD
    const dateStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
    
    const docRef = doc(db, "users", userId, "daily_stats", dateStr);
    await setDoc(docRef, {
      studyMinutes: increment(1),
      updatedAt: Date.now(),
      dateStr
    }, { merge: true });
  } catch (error) {
    console.error("Error incrementing study minute:", error);
  }
}

export async function fetchWeeklyStudyData(userId: string): Promise<{ dateStr: string, studyMinutes: number }[]> {
  try {
    const q = query(collection(db, "users", userId, "daily_stats"), orderBy("dateStr", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        dateStr: data.dateStr || d.id,
        studyMinutes: data.studyMinutes || 0
      };
    });
  } catch (error) {
    console.error("Error fetching weekly study data:", error);
    return [];
  }
}
