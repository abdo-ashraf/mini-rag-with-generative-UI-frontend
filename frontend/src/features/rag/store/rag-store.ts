import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  fullPrompt?: string
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  uploadedAt: string
}

interface RagState {
  projectId: number
  chunkSize: number
  overlapSize: number
  doReset: boolean
  activeTab: string
  activeFileId: string | null
  uploadedFiles: UploadedFile[]
  chatHistory: Message[]
  searchResults: { text: string; score: number }[]
}

interface RagActions {
  setProjectId: (id: number) => void
  setChunkSize: (size: number) => void
  setOverlapSize: (size: number) => void
  setDoReset: (reset: boolean) => void
  setActiveTab: (tab: string) => void
  setActiveFileId: (id: string | null) => void
  addUploadedFile: (file: UploadedFile) => void
  clearUploadedFiles: () => void
  addChatMessage: (msg: Omit<Message, "id">) => void
  clearChatHistory: () => void
  setSearchResults: (results: { text: string; score: number }[]) => void
}

export const useRagStore = create<RagState & RagActions>()(
  persist(
    (set) => ({
      // Initial state
      projectId: 1,
      chunkSize: 100,
      overlapSize: 20,
      doReset: false,
      activeTab: "qa",
      activeFileId: null,
      uploadedFiles: [],
      chatHistory: [
        {
          id: "welcome",
          role: "assistant",
          content: "Welcome to Mini RAG! Upload a document to index it, search its content, or ask RAG questions.",
        },
      ],
      searchResults: [],

      // Actions
      setProjectId: (projectId) => set({ projectId }),
      setChunkSize: (chunkSize) => set({ chunkSize }),
      setOverlapSize: (overlapSize) => set({ overlapSize }),
      setDoReset: (doReset) => set({ doReset }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setActiveFileId: (activeFileId) => set({ activeFileId }),
      addUploadedFile: (file) =>
        set((state) => ({
          uploadedFiles: [file, ...state.uploadedFiles],
          activeFileId: file.id,
        })),
      clearUploadedFiles: () => set({ uploadedFiles: [], activeFileId: null }),
      addChatMessage: (msg) =>
        set((state) => ({
          chatHistory: [
            ...state.chatHistory,
            { ...msg, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
          ],
        })),
      clearChatHistory: () =>
        set({
          chatHistory: [
            {
              id: "welcome",
              role: "assistant",
              content: "Welcome to Mini RAG! Upload a document to index it, search its content, or ask RAG questions.",
            },
          ],
        }),
      setSearchResults: (searchResults) => set({ searchResults }),
    }),
    {
      name: "mini-rag-store",
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          if (persistedState.activeTab === "debug") {
            persistedState.activeTab = "dashboard"
          }
        }
        return persistedState as RagState & RagActions
      },
    }
  )
)
