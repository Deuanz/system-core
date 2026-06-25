import { useState } from "react";
import { RoomList } from "./components/RoomList";
import { createRoom } from "./hooks/useRoom";

type Props = {
  onJoin: (roomId: string, accessCode?: string) => void;
  initialRoomId?: string;
  requireAccessCode?: boolean;
};

export function DjQueueHome({ onJoin, initialRoomId = "", requireAccessCode = false }: Props) {
  const [roomInput, setRoomInput] = useState(initialRoomId);
  const [createAccessCode, setCreateAccessCode] = useState("");
  const [joinAccessCode, setJoinAccessCode] = useState("");
  const [privateRoom, setPrivateRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const accessCode = createAccessCode.trim();
    if (privateRoom && !accessCode) {
      setError("Please set an access code for private rooms");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const roomId = await createRoom(privateRoom, accessCode || undefined);
      onJoin(roomId, accessCode || undefined);
    } catch {
      setError("Could not create room. Check server and access code.");
    } finally {
      setLoading(false);
    }
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const id = roomInput.trim();
    if (!id) return;
    const accessCode = joinAccessCode.trim();
    if (requireAccessCode && !accessCode) {
      setError("This room link requires an access code");
      return;
    }
    setError(null);
    onJoin(id, accessCode || undefined);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-4 py-10 text-primary">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-violet-400">
            Mini-app
          </p>
          <h1 className="text-4xl font-bold tracking-tight">i Queuez</h1>
          <p className="mt-3 text-muted">
            Search YouTube, build a shared playlist, and let the room play through the list.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-default bg-secondary/30 px-3 py-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={privateRoom}
              onChange={(e) => setPrivateRoom(e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
            Create as private room (hidden from Active rooms)
          </label>
          {privateRoom && (
            <input
              type="password"
              value={createAccessCode}
              onChange={(e) => setCreateAccessCode(e.target.value)}
              placeholder="Set access code"
              className="w-full rounded-xl border border-default bg-secondary px-4 py-3 focus:border-violet-500 focus:outline-none"
            />
          )}

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

          {requireAccessCode && (
            <p className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
              Room invite detected. Enter the access code before joining.
            </p>
          )}

          <form onSubmit={handleJoin} className="space-y-2">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Room code"
              className="w-full rounded-xl border border-default bg-secondary px-4 py-3 font-mono focus:border-violet-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="password"
                value={joinAccessCode}
                onChange={(e) => setJoinAccessCode(e.target.value)}
                placeholder="Access code (if needed)"
                className="flex-1 rounded-xl border border-default bg-secondary px-4 py-3 focus:border-violet-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!roomInput.trim() || (requireAccessCode && !joinAccessCode.trim())}
                className="rounded-xl border border-default px-5 py-3 font-medium hover:border-violet-500/50"
              >
                Join
              </button>
            </div>
          </form>
        </div>

        <section className="space-y-3 text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Active rooms</h2>
          <RoomList onJoin={onJoin} />
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <p className="text-xs text-muted">
          Run <code className="text-violet-300">bun run dev</code> from the project root to start
          the server and web app.
        </p>
      </div>
    </div>
  );
}
