import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { RoomSummary } from "@system-core/shared-types";
import { deleteRoom, listRooms } from "../hooks/useRoom";

type Props = {
  onJoin: (roomId: string, accessCode?: string, roomName?: string) => void;
};

export function RoomList({ onJoin }: Props) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessCodes, setAccessCodes] = useState<Record<string, string>>({});
  const [removingId, setRemovingId] = useState<string | null>(null);

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

  async function handleRemove(roomId: string) {
    setRemovingId(roomId);
    setError(null);
    try {
      await deleteRoom(roomId);
      setRooms((current) => current.filter((room) => room.roomId !== roomId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove room");
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <p className="rounded-xl border border-default bg-secondary/30 px-4 py-6 text-center text-sm text-muted">
        Loading rooms...
      </p>
    );
  }

  if (error && rooms.length === 0) {
    return <p className="text-center text-sm text-red-400">{error}</p>;
  }

  const activeRooms = rooms.filter((room) => room.clientCount > 0);
  const inactiveRooms = rooms.filter((room) => room.clientCount === 0);

  if (rooms.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-default px-4 py-6 text-center text-sm text-muted">
        No rooms yet — create one to get started
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      <RoomSection
        title="Active rooms"
        emptyLabel="No one is in a room right now"
        rooms={activeRooms}
        accessCodes={accessCodes}
        setAccessCodes={setAccessCodes}
        onJoin={onJoin}
      />
      <RoomSection
        title="Inactive rooms"
        emptyLabel="No inactive rooms"
        rooms={inactiveRooms}
        accessCodes={accessCodes}
        setAccessCodes={setAccessCodes}
        onJoin={onJoin}
        onRemove={handleRemove}
        removingId={removingId}
      />
    </div>
  );
}

type RoomSectionProps = {
  title: string;
  emptyLabel: string;
  rooms: RoomSummary[];
  accessCodes: Record<string, string>;
  setAccessCodes: Dispatch<SetStateAction<Record<string, string>>>;
  onJoin: (roomId: string, accessCode?: string, roomName?: string) => void;
  onRemove?: (roomId: string) => void;
  removingId?: string | null;
};

function RoomSection({
  title,
  emptyLabel,
  rooms,
  accessCodes,
  setAccessCodes,
  onJoin,
  onRemove,
  removingId,
}: RoomSectionProps) {
  return (
    <section className="space-y-3 text-left">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {rooms.length === 0 ? (
        <p className="rounded-xl border border-dashed border-default px-4 py-6 text-center text-sm text-muted">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((room) => {
            const accessCode = accessCodes[room.roomId] ?? "";
            const removing = removingId === room.roomId;

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
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(room.roomId)}
                      disabled={removing}
                      className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {removing ? "Removing..." : "Remove"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
