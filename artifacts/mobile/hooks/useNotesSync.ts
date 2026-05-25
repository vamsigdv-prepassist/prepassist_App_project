import { useCallback, useRef } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { TrackerNote } from "@/contexts/AppContext";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = DOMAIN ? `https://${DOMAIN}/api` : "/api";

export interface CloudNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  subject: string;
  tags: string[];
  is_starred: boolean;
  image_uri?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteUpdate {
  id: string;
  note_id: string;
  user_id: string;
  title: string;
  content: string;
  source?: string | null;
  status: "pending" | "merged" | "ignored";
  created_at: string;
}

function cloudToLocal(n: CloudNote): TrackerNote {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    subject: n.subject,
    tags: n.tags ?? [],
    isStarred: n.is_starred,
    imageUri: n.image_uri ?? undefined,
    createdAt: new Date(n.created_at).getTime(),
    cloudId: n.id,
  };
}

async function getJwt(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authFetch(path: string, options?: RequestInit): Promise<Response> {
  const jwt = await getJwt();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  });
}

export function useNotesSync() {
  const { user } = useAuth();
  const syncing = useRef(false);

  const fetchCloudNotes = useCallback(async (): Promise<TrackerNote[]> => {
    if (!user) return [];
    try {
      const res = await authFetch("/tracker-notes");
      if (!res.ok) return [];
      const { notes } = (await res.json()) as { notes: CloudNote[] };
      return (notes ?? []).map(cloudToLocal);
    } catch {
      return [];
    }
  }, [user]);

  const createCloudNote = useCallback(
    async (note: Omit<TrackerNote, "id" | "createdAt">): Promise<string | null> => {
      if (!user) return null;
      try {
        const res = await authFetch("/tracker-notes", {
          method: "POST",
          body: JSON.stringify({
            title: note.title,
            content: note.content,
            subject: note.subject,
            tags: note.tags,
            is_starred: note.isStarred,
            image_uri: note.imageUri ?? null,
          }),
        });
        if (!res.ok) return null;
        const { note: created } = (await res.json()) as { note: CloudNote };
        return created?.id ?? null;
      } catch {
        return null;
      }
    },
    [user],
  );

  const updateCloudNote = useCallback(
    async (id: string, patch: Partial<TrackerNote>): Promise<void> => {
      if (!user) return;
      try {
        await authFetch(`/tracker-notes/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...(patch.title !== undefined && { title: patch.title }),
            ...(patch.content !== undefined && { content: patch.content }),
            ...(patch.subject !== undefined && { subject: patch.subject }),
            ...(patch.tags !== undefined && { tags: patch.tags }),
            ...(patch.isStarred !== undefined && { is_starred: patch.isStarred }),
            ...(patch.imageUri !== undefined && { image_uri: patch.imageUri }),
          }),
        });
      } catch {
        // silent — local state is source of truth, cloud is best-effort
      }
    },
    [user],
  );

  const deleteCloudNote = useCallback(
    async (id: string): Promise<void> => {
      if (!user) return;
      try {
        await authFetch(`/tracker-notes/${id}`, { method: "DELETE" });
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
      const res = await authFetch("/tracker-notes/updates");
      if (!res.ok) return [];
      const { updates } = (await res.json()) as { updates: NoteUpdate[] };
      return updates ?? [];
    } catch {
      return [];
    }
  }, [user]);

  const mergeNoteUpdate = useCallback(
    async (updateId: string): Promise<void> => {
      if (!user) return;
      try {
        await authFetch(`/tracker-notes/updates/${updateId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "merged" }),
        });
      } catch {
        // silent
      }
    },
    [user],
  );

  const ignoreNoteUpdate = useCallback(
    async (updateId: string): Promise<void> => {
      if (!user) return;
      try {
        await authFetch(`/tracker-notes/updates/${updateId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "ignored" }),
        });
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
