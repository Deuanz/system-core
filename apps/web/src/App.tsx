import { useState } from "react";
import { createRoom } from "./mini-apps/dj-queue/hooks/useRoom";
import { DjQueueApp } from "./mini-apps/dj-queue/DjQueueApp";

function getRoomFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("room");
}

function setRoomInUrl(roomId: string | null) {
  const url = new URL(window.location.href);
  if (roomId) {
    url.searchParams.set("room", roomId);
  } else {
    url.searchParams.delete("room");
  }
  window.history.replaceState({}, "", url);
}

function Home({ onJoin }: { onJoin: (roomId: string) => void }) {
  const [roomInput, setRoomInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const roomId = await createRoom();
      onJoin(roomId);
    } catch {
      setError("Could not create room. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const id = roomInput.trim();
    if (!id) return;
    onJoin(id);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-4 text-primary">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-violet-400">
            Mini-app
          </p>
          <h1 className="text-4xl font-bold tracking-tight">DJ Queue</h1>
          <p className="mt-3 text-muted">
            Search YouTube, build a shared playlist, and let the room play through the list.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create a room"}
          </button>

          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="h-px flex-1 bg-default" />
            or join existing
            <span className="h-px flex-1 bg-default" />
          </div>

          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Room code"
              className="flex-1 rounded-xl border border-default bg-secondary px-4 py-3 font-mono focus:border-violet-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!roomInput.trim()}
              className="rounded-xl border border-default px-5 py-3 font-medium hover:border-violet-500/50"
            >
              Join
            </button>
          </form>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <p className="text-xs text-muted">
          Run <code className="text-violet-300">bun run dev</code> from the project root to start
          the server and web app.
        </p>
      </div>
    </div>
  );
}

function App() {
  const [roomId, setRoomId] = useState<string | null>(getRoomFromUrl);

  function joinRoom(id: string) {
    setRoomInUrl(id);
    setRoomId(id);
  }

  function leaveRoom() {
    setRoomInUrl(null);
    setRoomId(null);
  }

  if (roomId) {
    return <DjQueueApp roomId={roomId} onLeave={leaveRoom} />;
  }

  return <Home onJoin={joinRoom} />;
}

export default App;
