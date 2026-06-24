import { useEffect, useRef } from "react";

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
        };
      },
    );
    loadVideoById(videoId: string): void;
    stopVideo(): void;
    destroy(): void;
  }

  const PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
  };
}

let apiLoaded = false;
let apiLoading: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  if (apiLoading) return apiLoading;

  apiLoading = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });

  return apiLoading;
}

type Props = {
  videoId: string | null;
  isHost: boolean;
  onEnded: () => void;
};

export function YouTubePlayer({ videoId, isHost, onEnded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return;

      if (!playerRef.current) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: "100%",
          width: "100%",
          playerVars: {
            autoplay: isHost ? 1 : 0,
            controls: isHost ? 1 : 0,
            disablekb: isHost ? 0 : 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                onEndedRef.current();
              }
            },
          },
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isHost]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !videoId) return;

    if (isHost) {
      player.loadVideoById(videoId);
    }
  }, [videoId, isHost]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  if (!videoId) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-default bg-secondary text-muted">
        Nothing playing — add a song to the queue
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-default bg-black">
      <div ref={containerRef} className="h-full w-full" />
      {!isHost && (
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent pb-4">
          <span className="rounded-full bg-black/50 px-3 py-1 text-sm text-primary">
            Listening with the room
          </span>
        </div>
      )}
    </div>
  );
}
