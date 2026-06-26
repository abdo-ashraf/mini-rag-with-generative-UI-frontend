import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ragService } from "../services/rag-service"
import { type ProcessRequest } from "../types/rag-schema"

// Query Keys Prefix: qk-
export const ragQueryKeys = {
  welcome: () => ["rag", "welcome"] as const,
  projects: () => ["rag", "projects"] as const,
  projectFiles: (projectId: number) => ["rag", "project-files", projectId] as const,
  indexInfo: (projectId: number) => ["rag", "index-info", projectId] as const,
  chunksCount: (projectId: number) => ["rag", "chunks-count", projectId] as const,
}

// 1. Get welcome metadata
export const useWelcome = () => {
  return useQuery({
    queryKey: ragQueryKeys.welcome(),
    queryFn: () => ragService.getWelcome(),
    staleTime: 1000 * 60 * 5, // 5 mins stale
  })
}

export const useProjects = () => {
  return useQuery({
    queryKey: ragQueryKeys.projects(),
    queryFn: () => ragService.getProjects(),
    staleTime: 1000 * 30,
  })
}

export const useCreateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => ragService.createProject(),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: ragQueryKeys.projects(),
      })
      return data
    },
  })
}

export const useProjectFiles = (projectId: number) => {
  return useQuery({
    queryKey: ragQueryKeys.projectFiles(projectId),
    queryFn: () => ragService.getProjectFiles(projectId),
    enabled: projectId > 0,
    staleTime: 1000 * 10,
  })
}

// 2. Get vector collection info
export const useIndexInfo = (projectId: number, refetchIntervalMs: number | false = false) => {
  return useQuery({
    queryKey: ragQueryKeys.indexInfo(projectId),
    queryFn: () => ragService.getIndexInfo(projectId),
    enabled: projectId > 0,
    staleTime: 1000 * 10, // 10s stale
    refetchInterval: refetchIntervalMs,
  })
}

// 2.5 Get project chunks count
export const useChunksCount = (projectId: number) => {
  return useQuery({
    queryKey: ragQueryKeys.chunksCount(projectId),
    queryFn: () => ragService.getChunksCount(projectId),
    enabled: projectId > 0,
    staleTime: 1000 * 10,
  })
}

// 3. Upload a file
export const useUploadFile = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => ragService.uploadFile(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ragQueryKeys.projectFiles(projectId),
      })
    },
  })
}

// 4. Process file (chunking only)
export const useProcessFile = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProcessRequest) =>
      ragService.processFile(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ragQueryKeys.chunksCount(projectId),
      })
    },
  })
}

// 5. Process and index in one step
export const useProcessAndPush = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProcessRequest) =>
      ragService.processAndPush(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ragQueryKeys.chunksCount(projectId),
      })
      queryClient.invalidateQueries({
        queryKey: ragQueryKeys.indexInfo(projectId),
      })
    },
  })
}

// 6. Index existing chunks
export const usePushIndex = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { do_reset: number }) =>
      ragService.pushIndex(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ragQueryKeys.indexInfo(projectId),
      })
    },
  })
}

// 7. Search index
export const useSearchIndex = (projectId: number) => {
  return useMutation({
    mutationFn: (payload: { text: string; limit?: number; distance_metric?: string; min_score?: number }) =>
      ragService.searchIndex(projectId, payload),
  })
}

// 8. Delete a file from a project
export const useDeleteFile = (projectId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fileId: number) => ragService.deleteFile(projectId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ragQueryKeys.projectFiles(projectId),
      })
      queryClient.invalidateQueries({
        queryKey: ragQueryKeys.indexInfo(projectId),
      })
      queryClient.invalidateQueries({
        queryKey: ragQueryKeys.chunksCount(projectId),
      })
    },
  })
}

// 9. Delete project
export const useDeleteProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: number) => ragService.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ragQueryKeys.projects(),
      })
    },
  })
}

// 9. Ask RAG Question
export const useAnswerRag = (projectId: number) => {
  return useMutation({
    mutationFn: (payload: { text: string; limit?: number; distance_metric?: string; min_score?: number }) =>
      ragService.answerRag(projectId, payload),
  })
}
