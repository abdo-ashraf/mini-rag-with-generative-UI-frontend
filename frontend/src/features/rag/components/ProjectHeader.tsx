import { useEffect } from "react"
import { useRagStore } from "../store/rag-store"
import { useCreateProject, useDeleteProject, useProjects, useWelcome } from "../hooks/use-rag"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { ActivityIcon, ServerIcon, DatabaseIcon, Trash2Icon } from "lucide-react"

export function ProjectHeader() {
  const { projectId, setProjectId } = useRagStore()
  const { data: welcomeData, isLoading, isError } = useWelcome()
  const { data: projectsData, isLoading: projectsLoading } = useProjects()
  const createProjectMutation = useCreateProject()
  const deleteProjectMutation = useDeleteProject()

  const projects = projectsData?.projects ?? []

  useEffect(() => {
    if (projects.length === 0) return

    const hasCurrentProject = projects.some((project) => project.project_id === projectId)
    if (!hasCurrentProject) {
      setProjectId(projects[0].project_id)
    }
  }, [projectId, projects, setProjectId])

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val)) {
      setProjectId(val)
    }
  }

  const handleCreateProject = () => {
    createProjectMutation.mutate(undefined, {
      onSuccess: (data) => {
        setProjectId(data.project.project_id)
      },
    })
  }

  const handleDeleteProject = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete Project ${projectId}? This will permanently remove all files, chunks, embeddings, and the project record. This action cannot be undone.`
    )
    if (!confirmed) return

    deleteProjectMutation.mutate(projectId, {
      onSuccess: () => {
        const remaining = projects.filter((p) => p.project_id !== projectId)
        if (remaining.length > 0) {
          setProjectId(remaining[0].project_id)
        } else {
          handleCreateProject()
        }
      },
    })
  }

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border bg-card p-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2 text-primary">
          <DatabaseIcon className="size-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {welcomeData?.app_name || "Mini RAG"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Educational Document Search & Q&A Workspace · v{welcomeData?.app_version || "1.0.0"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Project Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="projectId" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Active Project ID:
          </label>
          <select
            id="projectId"
            value={projectId}
            onChange={handleProjectChange}
            disabled={projectsLoading || projects.length === 0}
            className="h-9 min-w-[11rem] rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {projects.length === 0 ? (
              <option value={projectId}>No projects available</option>
            ) : null}
            {projects.map((project) => (
              <option key={project.project_id} value={project.project_id}>
                Project {project.project_id}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCreateProject}
            disabled={createProjectMutation.isPending}
            className="h-9"
          >
            {createProjectMutation.isPending ? "Creating..." : "New Project"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeleteProject}
            disabled={deleteProjectMutation.isPending || projects.length === 0}
            className="h-9 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
          >
            {deleteProjectMutation.isPending ? (
              "Deleting..."
            ) : (
              <>
                <Trash2Icon className="size-3.5 mr-1" />
                Delete
              </>
            )}
          </Button>
        </div>

        {/* API Status Badge */}
        <div className="flex items-center gap-1.5">
          {isLoading ? (
            <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
              <ActivityIcon className="size-3 animate-pulse" />
              Connecting...
            </Badge>
          ) : isError ? (
            <Badge variant="outline" className="flex items-center gap-1 bg-red-50 text-red-700 border-red-200">
              <ServerIcon className="size-3" />
              API Offline
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
              <ServerIcon className="size-3" />
              Connected
            </Badge>
          )}
        </div>
      </div>
    </header>
  )
}
