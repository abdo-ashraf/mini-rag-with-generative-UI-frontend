import { z } from "zod"

// 1. Core Signal Enum
export const SignalSchema = z.enum([
  "file_validate_successfully",
  "file_type_not_supported",
  "file_size_exceeded",
  "file_upload_success",
  "file_upload_failed",
  "processing_success",
  "processing_failed",
  "not_found_files",
  "no_file_found_with_this_id",
  "project_not_found",
  "insert_into_vectordb_error",
  "insert_into_vectordb_success",
  "vectordb_collection_retrieved",
  "vectordb_search_error",
  "vectordb_search_success",
  "rag_answer_error",
  "rag_answer_success",
  "data_push_task_ready",
  "process_and_push_workflow_ready",
  "project_delete_success",
  "project_delete_error",
])
export type ResponseSignal = z.infer<typeof SignalSchema>

// 2. Base App Info Schema
export const AppInfoSchema = z.object({
  app_name: z.string(),
  app_version: z.string(),
})
export type AppInfo = z.infer<typeof AppInfoSchema>

export const ProjectSummarySchema = z.object({
  project_id: z.number().int(),
  created_at: z.string().nullable().optional(),
})
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>

export const ProjectsResponseSchema = z.object({
  projects: z.array(ProjectSummarySchema),
})
export type ProjectsResponse = z.infer<typeof ProjectsResponseSchema>

export const CreateProjectResponseSchema = z.object({
  project: ProjectSummarySchema,
})
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>

// 3. File Upload Response Schema
export const FileUploadResponseSchema = z.object({
  signal: SignalSchema,
  file_id: z.string().optional(),
})
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>

export const ProjectFileSchema = z.object({
  file_id: z.number().int(),
  file_name: z.string(),
  file_size: z.number().int(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})
export type ProjectFile = z.infer<typeof ProjectFileSchema>

export const ProjectFilesResponseSchema = z.object({
  project_id: z.number().int(),
  file_count: z.number().int(),
  files: z.array(ProjectFileSchema),
})
export type ProjectFilesResponse = z.infer<typeof ProjectFilesResponseSchema>

// 4. Process Request (Input validation)
export const ProcessRequestSchema = z.object({
  file_id: z.string().nullable().optional(),
  chunk_size: z.number().int().min(1).default(100),
  overlap_size: z.number().int().min(0).default(20),
  do_reset: z.number().int().min(0).max(1).default(0),
})
export type ProcessRequest = z.infer<typeof ProcessRequestSchema>

// 5. Task Response Schema (Celery job reference)
export const TaskResponseSchema = z.object({
  signal: SignalSchema,
  task_id: z.string().optional(),
  workflow_task_id: z.string().optional(),
})
export type TaskResponse = z.infer<typeof TaskResponseSchema>

// 6. Vector Collection Info Schema
export const CollectionInfoSchema = z.object({
  signal: SignalSchema,
  collection_info: z.object({
    name: z.string().optional(),
    points_count: z.number().optional(),
    vectors_count: z.number().optional(),
  }).catchall(z.any()),
})
export type CollectionInfo = z.infer<typeof CollectionInfoSchema>

// 7. Search Results Schema
export const RetrievedDocumentSchema = z.object({
  text: z.string(),
  score: z.number(),
})
export type RetrievedDocument = z.infer<typeof RetrievedDocumentSchema>

export const SearchResponseSchema = z.object({
  signal: SignalSchema,
  results: z.array(RetrievedDocumentSchema),
})
export type SearchResponse = z.infer<typeof SearchResponseSchema>

// 8. RAG Answer Schema
export const AnswerResponseSchema = z.object({
  signal: SignalSchema,
  answer: z.string(),
  full_prompt: z.string(),
  chat_history: z.array(z.record(z.string(), z.any())),
})
export type AnswerResponse = z.infer<typeof AnswerResponseSchema>
