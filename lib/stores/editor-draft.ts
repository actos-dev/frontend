import { create } from "zustand";

export const DRAFT_STORAGE_KEY = "actos_draft_new_post";

export interface PostDraft {
  title: string;
  body: string;
  tags: string[];
  updatedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Retrieves the post draft from localStorage.
 */
export function getStoredDraft(): PostDraft | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PostDraft;
    if (typeof parsed === "object" && parsed !== null) {
      return {
        title: typeof parsed.title === "string" ? parsed.title : "",
        body: typeof parsed.body === "string" ? parsed.body : "",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      };
    }
    return null;
  } catch (error) {
    console.warn("Failed to retrieve post draft from localStorage:", error);
    return null;
  }
}

/**
 * Saves post draft to localStorage.
 */
export function saveStoredDraft(draft: { title: string; body: string; tags: string[] }): void {
  if (!isBrowser()) return;
  try {
    const isBlank = !draft.title.trim() && !draft.body.trim() && draft.tags.length === 0;

    if (isBlank) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }

    const payload: PostDraft = {
      title: draft.title,
      body: draft.body,
      tags: draft.tags,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to save post draft to localStorage:", error);
  }
}

/**
 * Clears the post draft from localStorage.
 */
export function clearStoredDraft(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear post draft from localStorage:", error);
  }
}

export interface EditorDraftStore {
  title: string;
  body: string;
  tags: string[];
  isLoaded: boolean;
  hasDraft: boolean;
  setTitle: (title: string) => void;
  setBody: (body: string) => void;
  setTags: (tags: string[]) => void;
  loadDraft: () => boolean;
  clearDraft: () => void;
}

export const useEditorDraftStore = create<EditorDraftStore>((set, get) => ({
  title: "",
  body: "",
  tags: [],
  isLoaded: false,
  hasDraft: false,

  loadDraft: () => {
    const draft = getStoredDraft();
    if (draft && (draft.title || draft.body || draft.tags.length > 0)) {
      set({
        title: draft.title,
        body: draft.body,
        tags: draft.tags,
        isLoaded: true,
        hasDraft: true,
      });
      return true;
    }
    set({ isLoaded: true, hasDraft: false });
    return false;
  },

  setTitle: (title: string) => {
    set({ title });
    const current = get();
    saveStoredDraft({ title, body: current.body, tags: current.tags });
    set({ hasDraft: Boolean(title.trim() || current.body.trim() || current.tags.length > 0) });
  },

  setBody: (body: string) => {
    set({ body });
    const current = get();
    saveStoredDraft({ title: current.title, body, tags: current.tags });
    set({ hasDraft: Boolean(current.title.trim() || body.trim() || current.tags.length > 0) });
  },

  setTags: (tags: string[]) => {
    set({ tags });
    const current = get();
    saveStoredDraft({ title: current.title, body: current.body, tags });
    set({ hasDraft: Boolean(current.title.trim() || current.body.trim() || tags.length > 0) });
  },

  clearDraft: () => {
    clearStoredDraft();
    set({
      title: "",
      body: "",
      tags: [],
      hasDraft: false,
    });
  },
}));
