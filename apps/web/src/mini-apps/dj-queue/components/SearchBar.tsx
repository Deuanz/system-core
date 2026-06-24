import { useState } from "react";
import type { YouTubeSearchResult } from "@system-core/shared-types";
import { resolveYouTubeUrl, searchYouTube } from "../hooks/useRoom";

type Props = {
  onAdd: (video: YouTubeSearchResult) => void;
};

export function SearchBar({ onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const trimmed = query.trim();
      const isUrl =
        trimmed.includes("youtube.com") ||
        trimmed.includes("youtu.be") ||
        /^[a-zA-Z0-9_-]{11}$/.test(trimmed);

      if (isUrl) {
        const video = await resolveYouTubeUrl(trimmed);
        onAdd(video);
        setQuery("");
        setResults([]);
        return;
      }

      const found = await searchYouTube(trimmed);
      setResults(found);
      if (found.length === 0) setError("No results found");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search YouTube or paste a link..."
          className="flex-1 rounded-lg border border-default bg-secondary px-4 py-2.5 text-primary placeholder:text-muted focus:border-violet-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "..." : "Search"}
        </button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {results.length > 0 && (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {results.map((video) => (
            <li
              key={video.videoId}
              className="flex items-center gap-3 rounded-lg border border-default bg-secondary p-2"
            >
              <img
                src={video.thumbnailUrl}
                alt=""
                className="h-14 w-24 shrink-0 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary">{video.title}</p>
                <p className="truncate text-xs text-muted">{video.channelTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => onAdd(video)}
                className="shrink-0 rounded-lg bg-violet-600/20 px-3 py-1.5 text-sm font-medium text-violet-300 hover:bg-violet-600/40"
              >
                + Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
