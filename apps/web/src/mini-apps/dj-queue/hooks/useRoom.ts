import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RoomState,
  WsClientMessage,
  WsServerMessage,
  YouTubeSearchResult,
} from "@system-core/shared-types";

const CLIENT_ID_KEY = "dj-queue-client-id";
const NAME_KEY = "dj-queue-name";

function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function getDisplayName(): string {
  return localStorage.getItem(NAME_KEY) ?? "Guest";
}

export function setDisplayName(name: string) {
  localStorage.setItem(NAME_KEY, name.trim() || "Guest");
}

function wsUrl(roomId: string, clientId: string) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/rooms/${roomId}?clientId=${clientId}`;
}

export function useRoom(roomId: string) {
  const clientId = useRef(getClientId()).current;
  const [state, setState] = useState<RoomState | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const send = useCallback((message: WsClientMessage) => {
    wsRef.current?.send(JSON.stringify(message));
  }, []);

  useEffect(() => {
    const ws = new WebSocket(wsUrl(roomId, clientId));
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      send({
        type: "join",
        clientId,
        requestedBy: getDisplayName(),
      });
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as WsServerMessage;
      if (msg.type === "state") {
        setState(msg.state);
        setIsHost(msg.isHost);
      } else if (msg.type === "error") {
        setError(msg.message);
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setError("Connection lost");

    return () => ws.close();
  }, [roomId, clientId, send]);

  const addToQueue = useCallback(
    (video: YouTubeSearchResult) => {
      send({
        type: "add_to_queue",
        clientId,
        video,
        requestedBy: getDisplayName(),
      });
    },
    [clientId, send],
  );

  const skip = useCallback(() => {
    send({ type: "skip", clientId });
  }, [clientId, send]);

  const trackEnded = useCallback(() => {
    send({ type: "track_ended", clientId });
  }, [clientId, send]);

  const becomeHost = useCallback(() => {
    send({ type: "become_host", clientId });
  }, [clientId, send]);

  return {
    clientId,
    state,
    isHost,
    connected,
    error,
    addToQueue,
    skip,
    trackEnded,
    becomeHost,
  };
}

export async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
  const data = (await res.json()) as { results?: YouTubeSearchResult[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Search failed");
  return data.results ?? [];
}

export async function resolveYouTubeUrl(input: string): Promise<YouTubeSearchResult> {
  const res = await fetch(`/api/youtube/resolve?url=${encodeURIComponent(input)}`);
  const data = (await res.json()) as { video?: YouTubeSearchResult; error?: string };
  if (!res.ok || !data.video) throw new Error(data.error ?? "Invalid YouTube URL");
  return data.video;
}

export async function createRoom(): Promise<string> {
  const res = await fetch("/api/rooms", { method: "POST" });
  const data = (await res.json()) as { roomId: string };
  return data.roomId;
}
