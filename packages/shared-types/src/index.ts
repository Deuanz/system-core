export type QueueItem = {
  id: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  requestedBy: string;
  addedAt: number;
};

export type HostRequest = {
  clientId: string;
  requestedBy: string;
};

export type RoomState = {
  roomId: string;
  isPrivate: boolean;
  queue: QueueItem[];
  nowPlaying: QueueItem | null;
  isPlaying: boolean;
  hostClientId: string | null;
  pendingHostRequest: HostRequest | null;
};

export type RoomSummary = {
  roomId: string;
  isPrivate: boolean;
  clientCount: number;
  queueLength: number;
  nowPlayingTitle: string | null;
};

export type YouTubeSearchResult = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
};

export type WsClientMessage =
  | {
      type: "join";
      clientId: string;
      requestedBy: string;
      accessCode?: string;
    }
  | {
      type: "add_to_queue";
      clientId: string;
      video: YouTubeSearchResult;
      requestedBy: string;
    }
  | { type: "track_ended"; clientId: string }
  | { type: "skip"; clientId: string }
  | { type: "remove_from_queue"; clientId: string; itemId: string }
  | { type: "become_host"; clientId: string; requestedBy: string }
  | { type: "respond_host_request"; clientId: string; approved: boolean };

export type WsServerMessage =
  | { type: "state"; state: RoomState; clientId: string; isHost: boolean }
  | { type: "error"; message: string };
