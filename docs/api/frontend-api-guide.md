# Mini RAG API Guide for Frontend Builders

This project is a small RAG backend. The frontend usually follows one of two flows:

1. Upload a document, process it into chunks, then index it for search and Q&A.
2. Skip the workflow steps and directly call search or answer for an existing project index.

The backend is intentionally simple. There is no authentication layer, no pagination, and no task-status polling endpoint. For frontend work, the most important contract is the `signal` field in every response and the fact that the long-running jobs return Celery task ids immediately.

## Base URLs

- Local FastAPI: `http://localhost:8000`
- Nginx reverse proxy: `http://localhost`

The API routes live under `/api/v1`.

## Response Pattern

Most endpoints return JSON shaped like this:

```json
{
  "signal": "some_backend_code",
  "...": "endpoint-specific data"
}
```

For the frontend, treat `signal` as the primary status field. HTTP status still matters, but this backend often returns extra meaning in `signal` rather than in the HTTP code alone.

### Signals the UI Should Know

The codebase defines these response signals:

- `file_validate_successfully`
- `file_type_not_supported`
- `file_size_exceeded`
- `file_upload_success`
- `file_upload_failed`
- `processing_success`
- `processing_failed`
- `not_found_files`
- `no_file_found_with_this_id`
- `project_not_found`
- `insert_into_vectordb_error`
- `insert_into_vectordb_success`
- `vectordb_collection_retrieved`
- `vectordb_search_error`
- `vectordb_search_success`
- `rag_answer_error`
- `rag_answer_success`
- `data_push_task_ready`
- `process_and_push_workflow_ready`

For a UI, the useful ones are mostly the success/failure pairs around upload, processing, indexing, search, and answer generation.

## Recommended Frontend Flow

### 1. Select or create a project context

Every data and NLP endpoint takes `project_id` in the path.

The backend currently auto-creates the project record and project file directory if the project does not already exist. That means the frontend can usually just keep a numeric project id and start using it.

### 2. Upload a file

Use the upload endpoint when a user picks a file from a file input.

Request details:

- Method: `POST`
- Path: `/api/v1/data/upload/{project_id}`
- Body: `multipart/form-data`
- Form field: `file`

Frontend notes:

- Show upload progress if your client supports it.
- If the backend returns `400` with `file_type_not_supported` or `file_size_exceeded`, show a user-friendly validation message.
- On success, store the returned `file_id`. The processing endpoint can use it later.

Example success response:

```json
{
  "signal": "file_upload_success",
  "file_id": "42"
}
```

### 3. Process the file

Use this when you want chunking only.

Request details:

- Method: `POST`
- Path: `/api/v1/data/process/{project_id}`
- Body: JSON

Request example:

```json
{
  "file_id": "42",
  "chunk_size": 100,
  "overlap_size": 20,
  "do_reset": 0
}
```

Frontend notes:

- The response is immediate and only queues a Celery job.
- There is no task status endpoint in this repository, so the UI should treat the returned `task_id` as a queued job reference, not as proof of completion.
- If you need progress updates later, you will need to add a polling endpoint or rely on Flower/Celery monitoring externally.

### 4. Process and index in one step

Use this for a simpler UX when a user wants to upload, chunk, and index in a single path.

Request details:

- Method: `POST`
- Path: `/api/v1/data/process-and-push/{project_id}`
- Body: JSON

This endpoint returns a `workflow_task_id` immediately.

### 5. Index existing chunks

Use this when chunks already exist and you only want to push them into the vector database.

Request details:

- Method: `POST`
- Path: `/api/v1/nlp/index/push/{project_id}`
- Body: JSON

Request example:

```json
{
  "do_reset": 0
}
```

### 6. Inspect the vector collection

Use this for debugging or an admin-style panel.

Request details:

- Method: `GET`
- Path: `/api/v1/nlp/index/info/{project_id}`

The `collection_info` payload is returned as a backend object dump. It is useful for diagnostics, but it is not a stable UI contract. Treat it as read-only metadata.

### 7. Search the index

This is the core UI feature for semantic retrieval.

Request details:

- Method: `POST`
- Path: `/api/v1/nlp/index/search/{project_id}`
- Body: JSON

Request example:

```json
{
  "text": "What is this document about?",
  "limit": 5
}
```

Success response shape:

```json
{
  "signal": "vectordb_search_success",
  "results": [
    {
      "text": "The document explains the indexing workflow.",
      "score": 0.91
    }
  ]
}
```

Frontend notes:

- Render the `results` array as ranked cards or a list.
- Use `score` as a relevance indicator, not as a percentage.
- The endpoint returns `400` with `vectordb_search_error` when nothing is found or the embedding/search layer fails.

### 8. Ask a RAG question

This is the answer-generation endpoint for the UI.

Request details:

- Method: `POST`
- Path: `/api/v1/nlp/index/answer/{project_id}`
- Body: JSON

Request example:

```json
{
  "text": "Summarize the uploaded content.",
  "limit": 5
}
```

Success response shape:

```json
{
  "signal": "rag_answer_success",
  "answer": "The document describes a minimal RAG workflow.",
  "full_prompt": "...assembled prompt...",
  "chat_history": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    }
  ]
}
```

Frontend notes:

- `answer` is the main field to display.
- `full_prompt` and `chat_history` are useful for debug or developer panels.
- `chat_history` is not perfectly uniform across LLM providers. Treat it as opaque debugging data rather than a stable rendering contract.
- If the backend cannot produce an answer, it returns `400` with `rag_answer_error`.

## Monitoring

The code exposes a Prometheus metrics endpoint at `/TrhBVe_m5gg2002_E5VVqS`.

That endpoint is operational, not a frontend feature. A UI normally does not call it directly, but it is part of the surfaced runtime contract and useful for deployment/ops documentation.

## Practical UI Suggestions

- Keep `project_id` in app state and reuse it across upload, process, search, and answer actions.
- Show three separate statuses in the UI: uploaded, processing queued, and indexed/ready.
- Treat Celery job ids as references only; the current backend does not expose job progress.
- Make the search and answer buttons available only after the index is ready, or clearly label them as best-effort actions.

## Reference Endpoints

- `GET /api/v1/` returns app metadata.
- `POST /api/v1/data/upload/{project_id}` uploads a file.
- `POST /api/v1/data/process/{project_id}` queues chunking.
- `POST /api/v1/data/process-and-push/{project_id}` queues the combined workflow.
- `POST /api/v1/nlp/index/push/{project_id}` queues vector indexing.
- `GET /api/v1/nlp/index/info/{project_id}` returns collection metadata.
- `POST /api/v1/nlp/index/search/{project_id}` returns ranked retrieval results.
- `POST /api/v1/nlp/index/answer/{project_id}` returns a generated answer.
- `GET /TrhBVe_m5gg2002_E5VVqS` exposes Prometheus metrics.