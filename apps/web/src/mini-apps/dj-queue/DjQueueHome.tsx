import { useEffect, useState } from "react";
import { DisplayNameDialog } from "./components/DisplayNameDialog";
import { RoomList } from "./components/RoomList";
import {
  createRoom,
  getRoomInfo,
  hasDisplayName,
  setDisplayName,
  type RoomInfo,
} from "./hooks/useRoom";

type Props = {
  onJoin: (roomId: string, accessCode?: string, roomName?: string) => void;
  inviteRoomSlug?: string;
  initialError?: string | null;
};

type PendingAction =
  | { type: "join"; roomId: string; accessCode?: string; roomName?: string }
  | { type: "create" };

export function DjQueueHome({ onJoin, inviteRoomSlug, initialError = null }: Props) {
  const [roomName, setRoomName] = useState("");
  const [createAccessCode, setCreateAccessCode] = useState("");
  const [privateRoom, setPrivateRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

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
        if (!info.isPrivate && hasDisplayName()) {
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

  function requestJoin(roomId: string, accessCode?: string, roomNameToJoin?: string) {
    if (hasDisplayName()) {
      onJoin(roomId, accessCode, roomNameToJoin);
      return;
    }
    setPendingAction({ type: "join", roomId, accessCode, roomName: roomNameToJoin });
  }

  async function createAndJoin() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room. Check server and access code.");
    } finally {
      setLoading(false);
    }
  }

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
    if (hasDisplayName()) {
      await createAndJoin();
      return;
    }
    setPendingAction({ type: "create" });
  }

  function handleInviteJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteRoom) return;
    const code = joinAccessCode.trim();
    if (inviteRoom.isPrivate && !code) {
      setError("Please enter the access code");
      return;
    }
    setError(null);
    requestJoin(inviteRoom.roomId, inviteRoom.isPrivate ? code : undefined, inviteRoom.name);
  }

  function handleNameConfirm(name: string) {
    const action = pendingAction;
    setDisplayName(name);
    setPendingAction(null);
    if (action?.type === "join") {
      onJoin(action.roomId, action.accessCode, action.roomName);
      return;
    }
    if (action?.type === "create") {
      void createAndJoin();
    }
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

        {inviteRoom && (
          <section className="space-y-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-left">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-violet-300">
                {inviteRoom.isPrivate ? "Private room" : "Room invite"}
              </p>
              <p className="mt-1 font-medium">{inviteRoom.name}</p>
              <p className="mt-1 text-sm text-muted">
                {inviteRoom.isPrivate
                  ? "Enter the access code to join this room."
                  : "Join this room to start listening."}
              </p>
            </div>
            <form onSubmit={handleInviteJoin} className="space-y-2">
              {inviteRoom.isPrivate && (
                <input
                  type="password"
                  value={joinAccessCode}
                  onChange={(e) => setJoinAccessCode(e.target.value)}
                  placeholder="Access code"
                  autoFocus
                  className="w-full rounded-xl border border-default bg-secondary px-4 py-3 focus:border-violet-500 focus:outline-none"
                />
              )}
              <button
                type="submit"
                disabled={inviteRoom.isPrivate && !joinAccessCode.trim()}
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
            onClick={() => void handleCreate()}
            disabled={loading || !roomName.trim()}
            className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create a room"}
          </button>
        </div>

        <RoomList onJoin={requestJoin} />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <p className="text-xs text-muted">
          Run <code className="text-violet-300">bun run dev</code> from the project root to start
          the server and web app.
        </p>
      </div>

      <DisplayNameDialog
        open={pendingAction !== null}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleNameConfirm}
      />
    </div>
  );
}
