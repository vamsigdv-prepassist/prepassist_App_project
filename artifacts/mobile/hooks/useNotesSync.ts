import { useCallback, useRef } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, query, where, setDoc, updateDoc, deleteDoc, arrayUnion } from "firebase/firestore";
import type { TrackerNote } from "@/contexts/AppContext";
import type { CloudNote as FirestoreCloudNote } from "@/lib/cloud_notes";

export interface NoteUpdate {
  id: string;
  note_id: string;
  title: string;
  source: string;
  date: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  status: "pending" | "merged" | "ignored";
  created_at: string;
}

function cloudToLocal(n: FirestoreCloudNote): TrackerNote {
  return {
    id: n.id || "unknown",
    title: n.title,
    content: n.content || "",
    subject: n.subject || "Uncategorized",
    tags: n.tags || [],
    isStarred: n.is_starred || false,
    imageUri: n.fileUrl || undefined,
    createdAt: n.createdAt || Date.now(),
    cloudId: n.id,
    
    // RAG Metadata
    hasUpdates: n.hasUpdates || false,
    updatesList: n.updatesList || [],
    ignoredUpdateIds: n.ignoredUpdateIds || [],
    mergedSources: n.mergedSources || []
  };
}

export function useNotesSync() {
  const { user } = useAuth();
  const syncing = useRef(false);

  const fetchCloudNotes = useCallback(async (): Promise<TrackerNote[]> => {
    if (!user) return [];
    try {
      const q = query(collection(db, "cloud_notes"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const all: FirestoreCloudNote[] = [];
      snap.forEach(d => all.push({ id: d.id, ...d.data() } as FirestoreCloudNote));
      
      const trackerNotes = all.filter(n => !n.isStaged);
      return trackerNotes.map(cloudToLocal).sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }, [user]);

  const createCloudNote = useCallback(
    async (note: Omit<TrackerNote, "id" | "createdAt">): Promise<string | null> => {
      if (!user) return null;
      try {
        const newId = "local_" + Date.now().toString(36);
        const payload: FirestoreCloudNote = {
          id: newId,
          userId: user.uid,
          title: note.title,
          content: note.content,
          subject: note.subject || "Uncategorized",
          tags: note.tags || [],
          is_starred: note.isStarred || false,
          type: "text",
          categoryType: "core",
          isStaged: false, // Ensures RAG Pipeline reads it!
          createdAt: Date.now(),
        };
        
        if (note.imageUri) {
            payload.fileUrl = note.imageUri;
        }
        
        await setDoc(doc(db, "cloud_notes", newId), payload);
        return newId;
      } catch (err) {
        console.error("Firebase Create Failed:", err);
        return null;
      }
    },
    [user],
  );

  const updateCloudNote = useCallback(
    async (id: string, patch: Partial<TrackerNote>): Promise<void> => {
      if (!user) return;
      try {
        const updatePayload: any = {};
        if (patch.title !== undefined) updatePayload.title = patch.title;
        if (patch.content !== undefined) updatePayload.content = patch.content;
        if (patch.subject !== undefined) updatePayload.subject = patch.subject;
        if (patch.tags !== undefined) updatePayload.tags = patch.tags;
        if (patch.isStarred !== undefined) updatePayload.is_starred = patch.isStarred;
        if (patch.imageUri !== undefined) updatePayload.fileUrl = patch.imageUri;
        if (patch.mergedSources !== undefined) updatePayload.mergedSources = patch.mergedSources;
        if (patch.hasUpdates !== undefined) updatePayload.hasUpdates = patch.hasUpdates;
        if (patch.updatesList !== undefined) updatePayload.updatesList = patch.updatesList;
        if (patch.ignoredUpdateIds !== undefined) updatePayload.ignoredUpdateIds = patch.ignoredUpdateIds;
        
        // Firestore strictly forbids undefined values anywhere in the payload (even inside nested objects/arrays).
        // This recursively removes any undefined properties to prevent silent crashes.
        const cleanPayload = JSON.parse(JSON.stringify(updatePayload));
        
        if (Object.keys(cleanPayload).length > 0) {
            await updateDoc(doc(db, "cloud_notes", id), cleanPayload);
        }
      } catch (err) {
        console.error("updateCloudNote Error:", err);
      }
    },
    [user],
  );

  const deleteCloudNote = useCallback(
    async (id: string): Promise<void> => {
      if (!user) return;
      try {
        await deleteDoc(doc(db, "cloud_notes", id));
      } catch {
        // silent
      }
    },
    [user],
  );

  // ── Note Updates (RAG-pushed updates from Vector DB) ─────────────────────

  const fetchNoteUpdates = useCallback(async (): Promise<NoteUpdate[]> => {
    if (!user) return [];
    try {
      const q = query(collection(db, "cloud_notes"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const updates: NoteUpdate[] = [];
      
      snap.forEach(d => {
        const note = d.data() as FirestoreCloudNote;
        if (note.hasUpdates && note.updatesList && note.updatesList.length > 0) {
          const ignoredSet = new Set(note.ignoredUpdateIds || []);
          
          note.updatesList.forEach((u: any) => {
             if (!ignoredSet.has(u.id)) {
                 updates.push({
                   id: u.id,
                   note_id: d.id,
                   title: u.title || "Update",
                   source: u.source || "Global Vault",
                   date: u.date || new Date().toISOString(),
                   excerpt: u.excerpt || "",
                   content: u.content || "",
                   imageUrl: u.imageUrl || undefined,
                   status: "pending",
                   created_at: new Date().toISOString()
                 });
             }
          });
        }
      });
      
      return updates;
    } catch {
      return [];
    }
  }, [user]);

  const mergeNoteUpdate = useCallback(
    async (updateId: string): Promise<void> => {
       // Legacy Supabase stub. Inside app/notes.tsx, handleMergeAllUpdates explicitly updates Firebase natively.
    },
    [user],
  );

  const ignoreNoteUpdate = useCallback(
    async (updateId: string, noteId?: string): Promise<void> => {
      if (!user) return;
      try {
        if (!noteId) {
            // If noteId is missing, find which note owns this update
            const q = query(collection(db, "cloud_notes"), where("userId", "==", user.uid));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
                const note = d.data() as FirestoreCloudNote;
                if (note.updatesList?.some((u: any) => u.id === updateId)) {
                    await updateDoc(doc(db, "cloud_notes", d.id), {
                        ignoredUpdateIds: arrayUnion(updateId)
                    });
                    break;
                }
            }
        } else {
            await updateDoc(doc(db, "cloud_notes", noteId), {
                ignoredUpdateIds: arrayUnion(updateId)
            });
        }
      } catch {
        // silent
      }
    },
    [user],
  );

  return {
    fetchCloudNotes,
    createCloudNote,
    updateCloudNote,
    deleteCloudNote,
    fetchNoteUpdates,
    mergeNoteUpdate,
    ignoreNoteUpdate,
    syncing,
  };
}
