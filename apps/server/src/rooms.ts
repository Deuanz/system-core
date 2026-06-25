import type { HostRequest, QueueItem, RoomState, RoomSummary } from "@system-core/shared-types";

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
  readonly name: string;
  readonly isPrivate: boolean;
  private readonly accessCode: string | null;
  queue: QueueItem[] = [];
  nowPlaying: QueueItem | null = null;
  isPlaying = false;
  private clients = new Map<string, RoomClient>();
  hostClientId: string | null = null;
  pendingHostRequest: HostRequest | null = null;

  constructor(id: string, name: string, isPrivate = false, accessCode?: string) {
    this.id = id;
    this.name = name.trim() || id;
    this.isPrivate = isPrivate;
    this.accessCode = accessCode?.trim() ? accessCode.trim() : null;
  }

  get clientCount(): number {
    return this.clients.size;
  }

  getState(): RoomState {
    return {
      roomId: this.id,
      name: this.name,
      isPrivate: this.isPrivate,
      queue: this.queue,
      nowPlaying: this.nowPlaying,
      isPlaying: this.isPlaying,
      hostClientId: this.hostClientId,
      pendingHostRequest: this.pendingHostRequest,
    };
  }

  toSummary(): RoomSummary {
    return {
      roomId: this.id,
      name: this.name,
      isPrivate: this.isPrivate,
      clientCount: this.clientCount,
      queueLength: this.queue.length,
      nowPlayingTitle: this.nowPlaying?.title ?? null,
    };
  }

  addClient(
    ws: ServerWebSocket<RoomSocketData>,
    clientId: string,
    requestedBy: string,
    accessCode?: string,
  ): { ok: true } | { ok: false; message: string } {
    if (this.isPrivate && this.accessCode && accessCode?.trim() !== this.accessCode) {
      return { ok: false, message: "Invalid access code for this private room" };
    }

    this.clients.set(clientId, { ws, clientId, requestedBy });

    if (!this.hostClientId) {
      this.hostClientId = clientId;
    }

    if (!this.nowPlaying && this.queue.length > 0) {
      this.playNext();
    }

    this.broadcast();
    return { ok: true };
  }

  removeClient(clientId: string) {
    this.clients.delete(clientId);

    if (this.hostClientId === clientId) {
      const next = this.clients.keys().next();
      this.hostClientId = next.done ? null : next.value;
      this.pendingHostRequest = null;
    } else if (this.pendingHostRequest?.clientId === clientId) {
      this.pendingHostRequest = null;
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

  removeFromQueue(clientId: string, itemId: string): boolean {
    if (this.hostClientId !== clientId) return false;

    const index = this.queue.findIndex((item) => item.id === itemId);
    if (index === -1) return false;

    this.queue.splice(index, 1);
    this.broadcast();
    return true;
  }

  onTrackEnded(clientId: string): boolean {
    if (this.hostClientId !== clientId) return false;
    this.playNext();
    return true;
  }

  becomeHost(clientId: string, requestedBy: string): boolean {
    if (!this.clients.has(clientId)) return false;
    if (this.hostClientId === clientId) return true;

    if (!this.hostClientId) {
      this.hostClientId = clientId;
      this.pendingHostRequest = null;
      this.broadcast();
      return true;
    }

    this.pendingHostRequest = { clientId, requestedBy };
    this.broadcast();
    return true;
  }

  respondHostRequest(hostClientId: string, approved: boolean): boolean {
    if (this.hostClientId !== hostClientId) return false;
    if (!this.pendingHostRequest) return false;

    if (approved && this.clients.has(this.pendingHostRequest.clientId)) {
      this.hostClientId = this.pendingHostRequest.clientId;
    }

    this.pendingHostRequest = null;
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

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getRoomByName(name: string): Room | undefined {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return undefined;

  for (const room of rooms.values()) {
    if (room.name.trim().toLowerCase() === normalized) {
      return room;
    }
  }
  return undefined;
}

export function resolveRoom(identifier: string): Room | undefined {
  return getRoom(identifier) ?? getRoomByName(identifier);
}

export function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Room(roomId, roomId);
    rooms.set(roomId, room);
  }
  return room;
}

export function createRoom(
  roomId: string,
  name: string,
  isPrivate = false,
  accessCode?: string,
): Room {
  const room = new Room(roomId, name, isPrivate, accessCode);
  rooms.set(roomId, room);
  return room;
}

export function generateRoomId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function listRooms(): RoomSummary[] {
  return [...rooms.values()]
    .filter((room) => room.clientCount > 0 && !room.isPrivate)
    .map((room) => room.toSummary())
    .sort((a, b) => b.clientCount - a.clientCount);
}
