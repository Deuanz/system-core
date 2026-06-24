import type { QueueItem, RoomState } from "@system-core/shared-types";

type RoomClient = {
  ws: ServerWebSocket<RoomSocketData>;
  clientId: string;
  requestedBy: string;
};

export type RoomSocketData = {
  roomId: string;
  clientId: string;
};

export class Room {
  readonly id: string;
  queue: QueueItem[] = [];
  nowPlaying: QueueItem | null = null;
  isPlaying = false;
  private clients = new Map<string, RoomClient>();
  hostClientId: string | null = null;

  constructor(id: string) {
    this.id = id;
  }

  getState(): RoomState {
    return {
      roomId: this.id,
      queue: this.queue,
      nowPlaying: this.nowPlaying,
      isPlaying: this.isPlaying,
      hostClientId: this.hostClientId,
    };
  }

  addClient(ws: ServerWebSocket<RoomSocketData>, clientId: string, requestedBy: string) {
    this.clients.set(clientId, { ws, clientId, requestedBy });

    if (!this.hostClientId) {
      this.hostClientId = clientId;
    }

    if (!this.nowPlaying && this.queue.length > 0) {
      this.playNext();
    }

    this.broadcast();
  }

  removeClient(clientId: string) {
    this.clients.delete(clientId);

    if (this.hostClientId === clientId) {
      const next = this.clients.keys().next();
      this.hostClientId = next.done ? null : next.value;
    }

    this.broadcast();
  }

  addToQueue(
    video: Pick<QueueItem, "videoId" | "title" | "thumbnailUrl" | "channelTitle">,
    requestedBy: string,
  ): QueueItem {
    const item: QueueItem = {
      id: crypto.randomUUID(),
      ...video,
      requestedBy,
      addedAt: Date.now(),
    };

    this.queue.push(item);

    if (!this.nowPlaying) {
      this.playNext();
    } else {
      this.broadcast();
    }

    return item;
  }

  skipTrack(clientId: string): boolean {
    if (this.hostClientId !== clientId) return false;
    this.playNext();
    return true;
  }

  onTrackEnded(clientId: string): boolean {
    if (this.hostClientId !== clientId) return false;
    this.playNext();
    return true;
  }

  becomeHost(clientId: string): boolean {
    if (!this.clients.has(clientId)) return false;
    this.hostClientId = clientId;
    this.broadcast();
    return true;
  }

  private playNext() {
    const next = this.queue.shift() ?? null;
    this.nowPlaying = next;
    this.isPlaying = next !== null;
    this.broadcast();
  }

  broadcast() {
    const state = this.getState();

    for (const { ws, clientId } of this.clients.values()) {
      ws.send(
        JSON.stringify({
          type: "state",
          state,
          clientId,
          isHost: clientId === this.hostClientId,
        }),
      );
    }
  }
}

const rooms = new Map<string, Room>();

export function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Room(roomId);
    rooms.set(roomId, room);
  }
  return room;
}

export function generateRoomId(): string {
  return crypto.randomUUID().slice(0, 8);
}
