import { collection, deleteDoc, doc, getDocs, query, where, setDoc } from "firebase/firestore";
import { deleteObject, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase";

export type NoteType = 'text' | 'file' | 'camera' | 'url';

export interface CloudNote {
  id?: string;
  userId: string;
  title: string;
  subject: string;
  categoryType: 'core' | 'optional' | 'other';
  type: NoteType;
  content: string; 
  fileUrl?: string; 
  sourceUrl?: string; 
  tags?: string[]; 
  createdAt?: number;
  isStaged?: boolean; 
  hasUpdates?: boolean;
  updatesList?: any[];
  ignoredUpdateIds?: string[];
  mergedSources?: any[];
}

export const uploadNoteStorage = async (uri: string, userId: string, fileName: string): Promise<string> => {
  try {
    const ext = fileName.split('.').pop();
    const cleanName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const storageRef = ref(storage, `cloud_vault/${cleanName}`);
    
    // Fetch blob from local URI
    const response = await fetch(uri);
    const blob = await response.blob();
    
    await uploadBytes(storageRef, blob);
    const publicUrl = await getDownloadURL(storageRef);
    
    return publicUrl;
  } catch (error) {
    console.error("Storage Upload Error:", error);
    throw error;
  }
};

export const saveCloudNote = async (note: CloudNote): Promise<string> => {
  try {
    const noteId = note.id || "local_" + Date.now().toString(36);
    
    const finalNote = {
      ...note,
      id: noteId,
      createdAt: note.createdAt || Date.now(),
    };
    
    const cleanData = JSON.parse(JSON.stringify(finalNote));
    const firestorePayload = {
       ...cleanData,
       isVerified: false
    };

    await setDoc(doc(db, "cloud_notes", noteId), firestorePayload);

    // Trigger Web App Vectorization Background Process
    try {
      const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || (DOMAIN ? `https://${DOMAIN}/api` : "http://localhost:3000/api");
      
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        fetch(`${API_BASE}/notes/vectorize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ noteId })
        }).catch(err => console.error("Web vectorization fetch failed:", err));
      }
    } catch (e) {
      console.warn("Async Pinecone sync trigger failed:", e);
    }

    return noteId;
  } catch (error) {
    console.error("Cloud Vault Save Error:", error);
    throw error;
  }
};

export const fetchCloudNotes = async (userId: string): Promise<CloudNote[]> => {
  try {
    const q = query(collection(db, "cloud_notes"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const existing: CloudNote[] = [];
    snap.forEach((doc) => {
      existing.push({ id: doc.id, ...doc.data() } as CloudNote);
    });
    
    // Sort desc by createdAt natively
    return existing.sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Cloud Vault Fetch Error:", error);
    throw error;
  }
};

export const deleteCloudNote = async (note: CloudNote): Promise<void> => {
  try {
    if (note.fileUrl && (note.fileUrl.includes("firebasestorage") || note.fileUrl.includes("google"))) {
      try {
        const qSameFile = query(collection(db, "cloud_notes"), where("fileUrl", "==", note.fileUrl));
        const snap = await getDocs(qSameFile);
        
        // If this is the absolute last note using it, physically purge the blob
        if (snap.docs.length <= 1) {
          const fileRef = ref(storage, note.fileUrl);
          await deleteObject(fileRef);
        } else {
          console.log("File is shared by other notes. Skipping physical deletion.");
        }
      } catch (storageError) {
        console.error("Storage Purge Missed/Skipped:", storageError);
      }
    }
    
    if (note.id) {
      await deleteDoc(doc(db, "cloud_notes", note.id));
    }
  } catch (error) {
    console.error("Cloud Vault Deletion Error:", error);
    throw error;
  }
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
