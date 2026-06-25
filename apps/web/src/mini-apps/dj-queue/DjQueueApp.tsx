import { useEffect, useState } from "react";
import { QueueList } from "./components/QueueList";
import { SearchBar } from "./components/SearchBar";
import { loadYouTubeApi, YouTubePlayer } from "./components/YouTubePlayer";
import { setDisplayName, useRoom } from "./hooks/useRoom";

type Props = {
  roomId: string;
  accessCode?: string;
  onLeave: (options?: { keepInvite?: boolean; error?: string }) => void;
};

export function DjQueueApp({ roomId, accessCode, onLeave }: Props) {
  const [name, setName] = useState(() => localStorage.getItem("dj-queue-name") ?? "");
  const {
    clientId,
    state,
    isHost,
    connected,
    error,
    addToQueue,
    skip,
    removeFromQueue,
    trackEnded,
    becomeHost,
    respondHostRequest,
  } = useRoom(roomId, accessCode);

  const pendingRequest = state?.pendingHostRequest ?? null;
  const hasPendingRequest = pendingRequest?.clientId === clientId;
  const hostHasPendingRequest = isHost && pendingRequest !== null;

  useEffect(() => {
    void loadYouTubeApi();
  }, []);

  useEffect(() => {
    if (error === "Invalid access code for this private room") {
      onLeave({ keepInvite: true, error: "Invalid access code. Please try again." });
    }
  }, [error, onLeave]);

  function saveName() {
    setDisplayName(name);
  }

  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(state?.name ?? roomId)}`;

  useEffect(() => {
    if (state?.name) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("room") !== state.name) {
        url.searchParams.set("room", state.name);
        window.history.replaceState({}, "", url);
      }
    }
  }, [state?.name]);

  return (
    <div className="min-h-screen bg-primary text-primary">
      <header className="border-b border-default bg-secondary/50 px-4 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">i Queuez</h1>
            <p className="text-sm text-muted">
              <span className="font-medium text-primary">{state?.name ?? roomId}</span>
              {state?.isPrivate && " · private"}
              {!connected && " · reconnecting..."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              placeholder="Your name"
              className="rounded-lg border border-default bg-primary px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none"
            />
            {!isHost && !hasPendingRequest && !pendingRequest && (
              <button
                type="button"
                onClick={becomeHost}
                className="rounded-lg border border-violet-500/40 px-3 py-1.5 text-sm text-violet-300 hover:bg-violet-500/10"
              >
                Become DJ
              </button>
            )}
            {!isHost && hasPendingRequest && (
              <span className="rounded-full bg-amber-600/20 px-3 py-1 text-xs font-medium text-amber-300">
                Waiting for DJ approval…
              </span>
            )}
            {isHost && (
              <span className="rounded-full bg-violet-600/20 px-3 py-1 text-xs font-medium text-violet-300">
                You are the DJ
              </span>
            )}
            <button
              type="button"
              onClick={() => onLeave()}
              className="rounded-lg border border-default px-3 py-1.5 text-sm text-muted hover:text-primary"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      {hostHasPendingRequest && pendingRequest && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-amber-200">
              <span className="font-medium">{pendingRequest.requestedBy}</span> wants to become
              the DJ
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => respondHostRequest(true)}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => respondHostRequest(false)}
                className="rounded-lg border border-default px-3 py-1.5 text-sm text-muted hover:text-primary"
              >
                Deny
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <YouTubePlayer
            videoId={state?.nowPlaying?.videoId ?? null}
            isHost={isHost}
            onEnded={trackEnded}
          />

          {state?.nowPlaying && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-default bg-secondary p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{state.nowPlaying.title}</p>
                <p className="truncate text-sm text-muted">
                  Requested by {state.nowPlaying.requestedBy}
                </p>
              </div>
              {isHost && (
                <button
                  type="button"
                  onClick={skip}
                  className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Skip
                </button>
              )}
            </div>
          )}

          <div className="rounded-lg border border-default bg-secondary/30 p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
              Share room
            </p>
            <code className="block truncate text-sm text-violet-300">{shareUrl}</code>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <aside className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Request a song
            </h2>
            <SearchBar onAdd={addToQueue} />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Up next ({state?.queue.length ?? 0})
            </h2>
            <QueueList
              queue={state?.queue ?? []}
              nowPlayingId={state?.nowPlaying?.id ?? null}
              isHost={isHost}
              onRemove={removeFromQueue}
            />
          </section>
        </aside>
      </main>
    </div>
  );
}
