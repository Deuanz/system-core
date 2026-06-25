import { useEffect, useState } from "react";
import type { RoomSummary } from "@system-core/shared-types";
import { listRooms } from "../hooks/useRoom";

type Props = {
  onJoin: (roomId: string, accessCode?: string, roomName?: string) => void;
};

export function RoomList({ onJoin }: Props) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessCodes, setAccessCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const next = await listRooms();
        if (!cancelled) {
          setRooms(next);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load rooms");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <p className="rounded-xl border border-default bg-secondary/30 px-4 py-6 text-center text-sm text-muted">
        Loading rooms...
      </p>
    );
  }

  if (error) {
    return <p className="text-center text-sm text-red-400">{error}</p>;
  }

  if (rooms.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-default px-4 py-6 text-center text-sm text-muted">
        No active rooms — create one to get started
      </p>
    );
  }

  return (
    <ul className="space-y-2 text-left">
      {rooms.map((room) => {
        const accessCode = accessCodes[room.roomId] ?? "";

        return (
          <li
            key={room.roomId}
            className="flex flex-col gap-2 rounded-xl border border-default bg-secondary p-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-violet-300">
                {room.name}
                {room.isPrivate && (
                  <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-300">
                    Private
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted">
                {room.clientCount} {room.clientCount === 1 ? "listener" : "listeners"}
                {room.queueLength > 0 && ` · ${room.queueLength} in queue`}
                {room.nowPlayingTitle && ` · ${room.nowPlayingTitle}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {room.isPrivate && (
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) =>
                    setAccessCodes((prev) => ({ ...prev, [room.roomId]: e.target.value }))
                  }
                  placeholder="Access code"
                  className="w-full rounded-lg border border-default bg-primary px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none sm:w-32"
                />
              )}
              <button
                type="button"
                onClick={() =>
                  onJoin(room.roomId, room.isPrivate ? accessCode.trim() : undefined, room.name)
                }
                disabled={room.isPrivate && !accessCode.trim()}
                className="shrink-0 rounded-lg border border-violet-500/40 px-3 py-1.5 text-sm text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
