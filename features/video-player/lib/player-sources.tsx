export type LocalMediaSource = {
  type: "local";
  videoId: number;
};

export type YoutubeMediaSource = {
  type: "youtube";
  url: string;
  videoId: string;
};

export type MediaSource =
  | LocalMediaSource
  | YoutubeMediaSource;
