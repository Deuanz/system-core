import { useState } from "react";
import { DjQueueApp } from "./mini-apps/dj-queue/DjQueueApp";
import { DjQueueHome } from "./mini-apps/dj-queue/DjQueueHome";

function getRoomFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("room");
}

function setRoomInUrl(roomId: string | null) {
  const url = new URL(window.location.href);
  if (roomId) {
    url.searchParams.set("room", roomId);
  } else {
    url.searchParams.delete("room");
  }
  window.history.replaceState({}, "", url);
}

function App() {
  const [roomId, setRoomId] = useState<string | null>(getRoomFromUrl);

  function joinRoom(id: string) {
    setRoomInUrl(id);
    setRoomId(id);
  }

  function leaveRoom() {
    setRoomInUrl(null);
    setRoomId(null);
  }

  if (roomId) {
    return <DjQueueApp roomId={roomId} onLeave={leaveRoom} />;
  }

  return <DjQueueHome onJoin={joinRoom} />;
}

export default App;
