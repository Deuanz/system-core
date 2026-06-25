import type { QueueItem } from "@system-core/shared-types";

type Props = {
  queue: QueueItem[];
  nowPlayingId: string | null;
  isHost?: boolean;
  onRemove?: (itemId: string) => void;
};

export function QueueList({ queue, nowPlayingId, isHost, onRemove }: Props) {
  if (queue.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-default px-4 py-8 text-center text-sm text-muted">
        Queue is empty — search and add songs above
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {queue.map((item, index) => (
        <li
          key={item.id}
          className={`flex items-center gap-3 rounded-lg border p-2 ${
            item.id === nowPlayingId
              ? "border-violet-500/50 bg-violet-500/10"
              : "border-default bg-secondary"
          }`}
        >
          <span className="w-6 shrink-0 text-center text-sm text-muted">{index + 1}</span>
          <img
            src={item.thumbnailUrl}
            alt=""
            className="h-10 w-16 shrink-0 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-primary">{item.title}</p>
            <p className="truncate text-xs text-muted">
              {item.requestedBy} · {item.channelTitle}
            </p>
          </div>
          {isHost && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${item.title} from queue`}
              className="shrink-0 rounded-lg border border-default px-2 py-1 text-xs text-muted hover:border-red-500/50 hover:text-red-400"
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}
