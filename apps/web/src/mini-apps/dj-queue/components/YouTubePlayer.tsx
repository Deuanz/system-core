import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

declare namespace YT {
  class Player {
    constructor(
      elementId: string,
      options: {
        height?: string;
        width?: string;
        videoId?: string;
        playerVars?: Record<string, number | string>;
        events?: {
          onReady?: (event: { target: Player }) => void;
          onStateChange?: (event: { data: number; target: Player }) => void;
          onError?: (event: { data: number }) => void;
        };
      },
    );
    loadVideoById(videoId: string): void;
    playVideo(): void;
    getPlayerState(): number;
    destroy(): void;
  }

  const PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    CUED: number;
  };
}

let apiLoaded = false;
let apiLoading: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
  if (apiLoaded && window.YT?.Player) return Promise.resolve();
  if (apiLoading) return apiLoading;

  apiLoading = new Promise((resolve) => {
    let poll: number | undefined;

    const finish = () => {
      if (poll !== undefined) window.clearInterval(poll);
      apiLoaded = true;
      resolve();
    };

    if (window.YT?.Player) {
      finish();
      return;
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      finish();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    // Script may already be cached and the ready callback may have fired.
    poll = window.setInterval(() => {
      if (window.YT?.Player) finish();
    }, 50);
  });

  return apiLoading;
}

type Props = {
  videoId: string | null;
  isHost: boolean;
  onEnded: () => void;
};

export function YouTubePlayer({ videoId, isHost, onEnded }: Props) {
  const mountId = useId().replace(/:/g, "");
  const elementId = `dj-queue-yt-${mountId}`;
  const playerRef = useRef<YT.Player | null>(null);
  const videoIdRef = useRef(videoId);
  const isHostRef = useRef(isHost);
  const onEndedRef = useRef(onEnded);
  const syncedVideoIdRef = useRef<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [needsPlayTap, setNeedsPlayTap] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  videoIdRef.current = videoId;
  isHostRef.current = isHost;
  onEndedRef.current = onEnded;

  function syncVideo(force = false): boolean {
    const player = playerRef.current;
    const id = videoIdRef.current;
    if (!player || !playerReady || !id || !isHostRef.current) return false;
    if (!force && syncedVideoIdRef.current === id) return true;

    setPlayerError(null);
    syncedVideoIdRef.current = id;
    player.loadVideoById(id);
    player.playVideo();
    return true;
  }

  function handlePlayTap() {
    const player = playerRef.current;
    if (!player || !playerReady) return;

    const state = player.getPlayerState();
    if (state === window.YT.PlayerState.CUED || state === window.YT.PlayerState.PAUSED) {
      player.playVideo();
    } else {
      syncVideo(true);
    }
    setNeedsPlayTap(false);
  }

  function clearPlayerElement() {
    const el = document.getElementById(elementId);
    if (el) el.replaceChildren();
  }

  useEffect(() => {
    if (!isHost) {
      syncedVideoIdRef.current = null;
      setPlayerReady(false);
      playerRef.current?.destroy();
      playerRef.current = null;
      clearPlayerElement();
      return;
    }

    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled) return;

      clearPlayerElement();
      const el = document.getElementById(elementId);
      if (!el) return;

      playerRef.current = new window.YT.Player(elementId, {
        height: "100%",
        width: "100%",
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setPlayerReady(true);
          },
          onStateChange: (event) => {
            if (!isHostRef.current) return;

            if (event.data === window.YT.PlayerState.ENDED) {
              syncedVideoIdRef.current = null;
              onEndedRef.current();
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              setNeedsPlayTap(false);
              setPlayerError(null);
            } else if (
              event.data === window.YT.PlayerState.CUED ||
              event.data === window.YT.PlayerState.PAUSED
            ) {
              setNeedsPlayTap(true);
            }
          },
          onError: () => {
            syncedVideoIdRef.current = null;
            setPlayerError("This video can't be played. Try skipping to the next song.");
            setNeedsPlayTap(false);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      syncedVideoIdRef.current = null;
      setPlayerReady(false);
      playerRef.current?.destroy();
      playerRef.current = null;
      clearPlayerElement();
    };
  }, [isHost, elementId]);

  useEffect(() => {
    if (!isHost || !videoId || !playerReady) return;
    syncVideo();
  }, [videoId, isHost, playerReady]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-default bg-black">
      {isHost && <div id={elementId} className="h-full w-full" />}

      {!isHost && videoId && (
        <>
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/50 px-3 py-1 text-sm text-primary">
              Audio plays on the DJ&apos;s device
            </span>
          </div>
        </>
      )}

      {!videoId && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary text-muted">
          Nothing playing — add a song to the queue
        </div>
      )}

      {isHost && needsPlayTap && videoId && !playerError && (
        <button
          type="button"
          onClick={handlePlayTap}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 text-primary"
        >
          <span className="rounded-full bg-violet-600 px-6 py-3 text-lg font-semibold text-white hover:bg-violet-500">
            ▶ Tap to play
          </span>
          <span className="text-sm text-muted">Browser requires a click to start audio</span>
        </button>
      )}

      {playerError && isHost && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-red-950/90 px-4 py-2 text-center text-sm text-red-200">
          {playerError}
        </div>
      )}
    </div>
  );
}
