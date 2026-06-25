import { useEffect, useState } from "react";
import { RoomList } from "./components/RoomList";
import { createRoom, getRoomInfo, type RoomInfo } from "./hooks/useRoom";

type Props = {
  onJoin: (roomId: string, accessCode?: string, roomName?: string) => void;
  inviteRoomSlug?: string;
  initialError?: string | null;
};

export function DjQueueHome({ onJoin, inviteRoomSlug, initialError = null }: Props) {
  const [roomName, setRoomName] = useState("");
  const [createAccessCode, setCreateAccessCode] = useState("");
  const [privateRoom, setPrivateRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const [inviteRoom, setInviteRoom] = useState<RoomInfo | null>(null);
  const [inviteLoading, setInviteLoading] = useState(Boolean(inviteRoomSlug));
  const [joinAccessCode, setJoinAccessCode] = useState("");

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  useEffect(() => {
    if (!inviteRoomSlug) return;
    const slug = inviteRoomSlug;

    let cancelled = false;

    async function loadInvite() {
      try {
        const info = await getRoomInfo(slug);
        if (cancelled) return;
        setInviteRoom(info);
        if (!info.isPrivate) {
          onJoin(info.roomId, undefined, info.name);
        }
      } catch {
        if (!cancelled) {
          setError("Room not found or no longer active");
        }
      } finally {
        if (!cancelled) {
          setInviteLoading(false);
        }
      }
    }

    loadInvite();
    return () => {
      cancelled = true;
    };
  }, [inviteRoomSlug, onJoin]);

  async function handleCreate() {
    const name = roomName.trim();
    if (!name) {
      setError("Please enter a room name");
      return;
    }
    const accessCode = createAccessCode.trim();
    if (privateRoom && !accessCode) {
      setError("Please set an access code for private rooms");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const roomId = await createRoom(name, privateRoom, accessCode || undefined);
      onJoin(roomId, accessCode || undefined, name);
    } catch {
      setError("Could not create room. Check server and access code.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrivateJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteRoom) return;
    const code = joinAccessCode.trim();
    if (!code) {
      setError("Please enter the access code");
      return;
    }
    setError(null);
    onJoin(inviteRoom.roomId, code, inviteRoom.name);
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

        {inviteLoading && (
          <p className="rounded-xl border border-default bg-secondary/30 px-4 py-3 text-sm text-muted">
            Checking room invite…
          </p>
        )}

        {inviteRoom?.isPrivate && (
          <section className="space-y-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-left">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-violet-300">
                Private room
              </p>
              <p className="mt-1 font-medium">{inviteRoom.name}</p>
              <p className="mt-1 text-sm text-muted">Enter the access code to join this room.</p>
            </div>
            <form onSubmit={handlePrivateJoin} className="space-y-2">
              <input
                type="password"
                value={joinAccessCode}
                onChange={(e) => setJoinAccessCode(e.target.value)}
                placeholder="Access code"
                autoFocus
                className="w-full rounded-xl border border-default bg-secondary px-4 py-3 focus:border-violet-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!joinAccessCode.trim()}
                className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                Join room
              </button>
            </form>
          </section>
        )}

        <div className="space-y-3">
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Room name"
            className="w-full rounded-xl border border-default bg-secondary px-4 py-3 focus:border-violet-500 focus:outline-none"
          />

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-default bg-secondary/30 px-3 py-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={privateRoom}
              onChange={(e) => setPrivateRoom(e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
            Create as private room (requires access code to join)
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
            disabled={loading || !roomName.trim()}
            className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create a room"}
          </button>
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
