import { useState } from "react"
import { useRagStore } from "../store/rag-store"
import { useSearchIndex } from "../hooks/use-rag"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Badge } from "@/shared/ui/badge"
import {
  SearchIcon,
  SearchCodeIcon,
  Loader2Icon,
  LayersIcon,
} from "lucide-react"

export function SearchPanel() {
  const { projectId, searchResults, setSearchResults } = useRagStore()
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(5)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const searchMutation = useSearchIndex(projectId)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || searchMutation.isPending) return

    setErrorMsg(null)

    searchMutation.mutate(
      { text: query.trim(), limit },
      {
        onSuccess: (data) => {
          if (data.signal === "vectordb_search_success") {
            setSearchResults(data.results || [])
            if (data.results.length === 0) {
              setErrorMsg("No matching vectors found for this query.")
            }
          } else {
            setErrorMsg(`Search failed: Backend returned signal "${data.signal}"`)
          }
        },
        onError: (err: any) => {
          setErrorMsg(err.message || "Failed to connect to backend search endpoint.")
        },
      }
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return "bg-green-50 text-green-700 border-green-200"
    if (score >= 0.7) return "bg-blue-50 text-blue-700 border-blue-200"
    return "bg-slate-50 text-slate-700 border-slate-200"
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
      {/* Search Bar Input */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-md flex items-center gap-2">
            <SearchCodeIcon className="size-4 text-primary" />
            Semantic Retrieval Testing
          </CardTitle>
          <CardDescription>
            Query PgVector/Qdrant directly to fetch relevant context documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Type query to find matching vector chunks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={searchMutation.isPending}
                className="pl-9 h-10 w-full"
              />
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="limit" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Max results:
              </label>
              <Input
                id="limit"
                type="number"
                min={1}
                max={50}
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10) || 5)}
                className="w-16 h-10"
                disabled={searchMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              disabled={!query.trim() || searchMutation.isPending}
              className="h-10 px-5 shrink-0"
            >
              {searchMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin mr-1.5" />
              ) : (
                <SearchIcon className="size-4 mr-1.5" />
              )}
              Search Index
            </Button>
          </form>

          {errorMsg && (
            <div className="mt-3 flex items-start gap-2.5 p-3 rounded-lg border border-red-100 bg-red-50/40 text-xs text-red-800">
              <span className="font-semibold text-red-900 shrink-0">Status:</span>
              <p>{errorMsg}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranked Search Results */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <LayersIcon className="size-4" />
            Ranked Context Blocks ({searchResults.length})
          </h2>
          {searchResults.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              Sorted by cosine similarity / distance metrics
            </span>
          )}
        </div>

        {searchMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-border rounded-xl bg-card">
            <Loader2Icon className="size-8 animate-spin text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Retrieving nearest neighbors...</span>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 border border-dashed border-border rounded-xl bg-card text-center">
            <div className="flex items-center justify-center size-12 rounded-full bg-muted text-muted-foreground/60 mb-2">
              <SearchIcon className="size-6" />
            </div>
            <span className="text-sm font-semibold text-foreground">No search results loaded</span>
            <span className="text-xs text-muted-foreground max-w-sm px-4">
              Enter a search query above to fetch nearest-neighbor text contexts from the active project vector DB collection.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {searchResults.map((doc, idx) => (
              <Card key={idx} className="shadow-sm border border-border hover:border-primary/20 transition-colors">
                <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b border-border bg-muted/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 px-1.5 font-mono text-[10px]">
                      Rank #{idx + 1}
                    </Badge>
                  </div>
                  <Badge variant="outline" className={`font-semibold font-mono text-[10px] ${getScoreColor(doc.score)}`}>
                    Similarity: {doc.score.toFixed(4)}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 text-sm leading-relaxed text-foreground select-all whitespace-pre-wrap">
                  {doc.text}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
