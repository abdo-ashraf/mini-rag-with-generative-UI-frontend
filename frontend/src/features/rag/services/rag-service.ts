import { z } from "zod"
import {
  AppInfoSchema,
  ProjectsResponseSchema,
  CreateProjectResponseSchema,
  ProjectFilesResponseSchema,
  FileUploadResponseSchema,
  TaskResponseSchema,
  CollectionInfoSchema,
  ChunksCountResponseSchema,
  SearchResponseSchema,
  AnswerResponseSchema,
  ProcessResponseSchema,
  PushIndexResponseSchema,
  type AppInfo,
  type ProjectsResponse,
  type CreateProjectResponse,
  type ProjectFilesResponse,
  type FileUploadResponse,
  type TaskResponse,
  type CollectionInfo,
  type ChunksCountResponse,
  type SearchResponse,
  type AnswerResponse,
  type ProcessResponse,
  type PushIndexResponse,
  type ProcessRequest,
} from "../types/rag-schema"

// Helper to handle response and validation
async function handleResponse<T>(
  response: Response,
  schema: z.ZodSchema<T>
): Promise<T> {
  const isJson = response.headers.get("content-type")?.includes("application/json")
  
  if (!response.ok) {
    if (isJson) {
      try {
        const errorData = await response.json()
        if (errorData && errorData.signal) {
          // If the backend returned a custom signal error, throw it so the hook can catch it
          throw new Error(errorData.signal)
        }
      } catch (e: any) {
        if (e.message && typeof e.message === "string") throw e
      }
    }
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
  }

  if (!isJson) {
    throw new Error("Expected JSON response from backend but received something else.")
  }

  const data = await response.json()
  return schema.parse(data)
}

export const ragService = {
  // GET /api/v1/ - Welcome/App info
  async getWelcome(): Promise<AppInfo> {
    const response = await fetch("/api/v1/")
    return handleResponse(response, AppInfoSchema)
  },

  // GET /api/v1/projects
  async getProjects(): Promise<ProjectsResponse> {
    const response = await fetch("/api/v1/projects")
    return handleResponse(response, ProjectsResponseSchema)
  },

  // POST /api/v1/projects
  async createProject(): Promise<CreateProjectResponse> {
    const response = await fetch("/api/v1/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    return handleResponse(response, CreateProjectResponseSchema)
  },

  // GET /api/v1/data/files/{project_id}
  async getProjectFiles(projectId: number): Promise<ProjectFilesResponse> {
    const response = await fetch(`/api/v1/data/files/${projectId}`)
    return handleResponse(response, ProjectFilesResponseSchema)
  },

  // POST /api/v1/data/upload/{project_id}
  async uploadFile(projectId: number, file: File): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch(`/api/v1/data/upload/${projectId}`, {
      method: "POST",
      body: formData,
    })
    return handleResponse(response, FileUploadResponseSchema)
  },

  // POST /api/v1/data/process/{project_id}
  async processFile(
    projectId: number,
    payload: ProcessRequest
  ): Promise<ProcessResponse> {
    const response = await fetch(`/api/v1/data/process/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return handleResponse(response, ProcessResponseSchema)
  },

  // POST /api/v1/data/process-and-push/{project_id}
  async processAndPush(
    projectId: number,
    payload: ProcessRequest
  ): Promise<TaskResponse> {
    const response = await fetch(`/api/v1/data/process-and-push/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return handleResponse(response, TaskResponseSchema)
  },

  // POST /api/v1/nlp/index/push/{project_id}
  async pushIndex(
    projectId: number,
    payload: { do_reset: number }
  ): Promise<PushIndexResponse> {
    const response = await fetch(`/api/v1/nlp/index/push/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return handleResponse(response, PushIndexResponseSchema)
  },

  // GET /api/v1/nlp/index/info/{project_id}
  async getIndexInfo(projectId: number): Promise<CollectionInfo> {
    const response = await fetch(`/api/v1/nlp/index/info/${projectId}`)
    return handleResponse(response, CollectionInfoSchema)
  },

  // POST /api/v1/nlp/index/search/{project_id}
  async searchIndex(
    projectId: number,
    payload: { text: string; limit?: number; distance_metric?: string; min_score?: number }
  ): Promise<SearchResponse> {
    const response = await fetch(`/api/v1/nlp/index/search/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return handleResponse(response, SearchResponseSchema)
  },

  // GET /api/v1/data/chunks/count/{project_id}
  async getChunksCount(projectId: number): Promise<ChunksCountResponse> {
    const response = await fetch(`/api/v1/data/chunks/count/${projectId}`)
    return handleResponse(response, ChunksCountResponseSchema)
  },

  // DELETE /api/v1/projects/{project_id}
  async deleteProject(projectId: number): Promise<{ signal: string; project_id: number }> {
    const response = await fetch(`/api/v1/projects/${projectId}`, {
      method: "DELETE",
    })
    const schema = z.object({
      signal: z.string(),
      project_id: z.number().int(),
    })
    return handleResponse(response, schema)
  },

  // DELETE /api/v1/data/files/{project_id}/{file_id}
  async deleteFile(projectId: number, fileId: number): Promise<{ signal: string; file_id: number }> {
    const response = await fetch(`/api/v1/data/files/${projectId}/${fileId}`, {
      method: "DELETE",
    })
    const schema = z.object({
      signal: z.string(),
      file_id: z.number().int(),
    })
    return handleResponse(response, schema)
  },

  // POST /api/v1/nlp/index/answer/{project_id}
  async answerRag(
    projectId: number,
    payload: { text: string; limit?: number; distance_metric?: string; min_score?: number }
  ): Promise<AnswerResponse> {
    const response = await fetch(`/api/v1/nlp/index/answer/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return handleResponse(response, AnswerResponseSchema)
  },
}
