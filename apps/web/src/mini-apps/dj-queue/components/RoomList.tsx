import { useEffect, useState } from "react";
import type { RoomSummary } from "@system-core/shared-types";
import { listRooms } from "../hooks/useRoom";

type Props = {
  onJoin: (roomId: string) => void;
};

export function RoomList({ onJoin }: Props) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      {rooms.map((room) => (
        <li
          key={room.roomId}
          className="flex items-center gap-3 rounded-xl border border-default bg-secondary p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-medium text-violet-300">{room.roomId}</p>
            <p className="truncate text-xs text-muted">
              {room.clientCount} {room.clientCount === 1 ? "listener" : "listeners"}
              {room.queueLength > 0 && ` · ${room.queueLength} in queue`}
              {room.nowPlayingTitle && ` · ${room.nowPlayingTitle}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onJoin(room.roomId)}
            className="shrink-0 rounded-lg border border-violet-500/40 px-3 py-1.5 text-sm text-violet-300 hover:bg-violet-500/10"
          >
            Join
          </button>
        </li>
      ))}
    </ul>
  );
}
