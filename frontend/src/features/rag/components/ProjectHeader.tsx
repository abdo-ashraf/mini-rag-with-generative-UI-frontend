import { useWelcome } from "../hooks/use-rag"
import { Badge } from "@/shared/ui/badge"
import { ActivityIcon, ServerIcon, DatabaseIcon } from "lucide-react"

export function ProjectHeader() {
  const { data: welcomeData, isLoading, isError } = useWelcome()

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
