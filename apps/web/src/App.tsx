import { useCallback, useState } from "react";
import { DjQueueApp } from "./mini-apps/dj-queue/DjQueueApp";
import { DjQueueHome } from "./mini-apps/dj-queue/DjQueueHome";
import { hasDisplayName } from "./mini-apps/dj-queue/hooks/useRoom";

function getRoomFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("room");
}

function setRoomInUrl(roomName: string | null) {
  const url = new URL(window.location.href);
  if (roomName) {
    url.searchParams.set("room", roomName);
  } else {
    url.searchParams.delete("room");
  }
  window.history.replaceState({}, "", url);
}

function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState<string | undefined>(undefined);
  const inviteRoomSlug = getRoomFromUrl();

  const [joinError, setJoinError] = useState<string | null>(null);

  const joinRoom = useCallback((id: string, roomAccessCode?: string, roomName?: string) => {
    if (!hasDisplayName()) {
      setJoinError("Please set your display name before joining a room");
      return;
    }
    setJoinError(null);
    setRoomInUrl(roomName ?? id);
    setRoomId(id);
    setAccessCode(roomAccessCode);
  }, []);

  const leaveRoom = useCallback((options?: { keepInvite?: boolean; error?: string }) => {
    if (!options?.keepInvite) {
      setRoomInUrl(null);
    }
    setRoomId(null);
    setAccessCode(undefined);
    if (options?.error) {
      setJoinError(options.error);
    }
  }, []);

  if (roomId) {
    return <DjQueueApp roomId={roomId} accessCode={accessCode} onLeave={leaveRoom} />;
  }

  return (
    <DjQueueHome
      onJoin={joinRoom}
      inviteRoomSlug={inviteRoomSlug ?? undefined}
      initialError={joinError}
    />
  );
}

export default App;
