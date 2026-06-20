import { useRagStore } from "@/features/rag/store/rag-store"
import { ProjectHeader } from "@/features/rag/components/ProjectHeader"
import { IngestPanel } from "@/features/rag/components/IngestPanel"
import { QaPanel } from "@/features/rag/components/QaPanel"
import { SearchPanel } from "@/features/rag/components/SearchPanel"
import { InfoPanel } from "@/features/rag/components/InfoPanel"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs"
import { MessageSquareIcon, SearchIcon, UploadIcon, DatabaseIcon } from "lucide-react"

function App() {
  const { activeTab, setActiveTab } = useRagStore()

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground select-none">
      {/* 1. Global Project Header */}
      <ProjectHeader />

      {/* 2. Primary Tabs Workspace Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border bg-card px-4 md:px-6 py-2 shrink-0">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl h-10">
            <TabsTrigger value="qa" className="flex items-center gap-1.5 cursor-pointer h-8">
              <MessageSquareIcon className="size-4" />
              <span className="hidden sm:inline font-semibold">Ask RAG Chat</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-1.5 cursor-pointer h-8">
              <SearchIcon className="size-4" />
              <span className="hidden sm:inline font-semibold">Semantic Search</span>
            </TabsTrigger>
            <TabsTrigger value="ingest" className="flex items-center gap-1.5 cursor-pointer h-8">
              <UploadIcon className="size-4" />
              <span className="hidden sm:inline font-semibold">Document Ingest</span>
            </TabsTrigger>
            <TabsTrigger value="debug" className="flex items-center gap-1.5 cursor-pointer h-8">
              <DatabaseIcon className="size-4" />
              <span className="hidden sm:inline font-semibold">Diagnostics</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 3. Panel Workspaces Content */}
        <div className="flex-1 overflow-y-auto bg-muted/5">
          <TabsContent value="qa" className="m-0 h-full focus-visible:outline-none">
            <QaPanel />
          </TabsContent>
          <TabsContent value="search" className="m-0 focus-visible:outline-none">
            <SearchPanel />
          </TabsContent>
          <TabsContent value="ingest" className="m-0 focus-visible:outline-none">
            <IngestPanel />
          </TabsContent>
          <TabsContent value="debug" className="m-0 focus-visible:outline-none">
            <InfoPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default App
