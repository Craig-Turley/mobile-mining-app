export type LocalMediaSource = {
  type: 'local';
  videoId: number;
};

export type YoutubeMediaSource = {
  type: 'youtube';
  /**
   * @type YoutubeCaptions
   */
  captions: string;
  videoId: string;
};

export type MediaSource = LocalMediaSource | YoutubeMediaSource;
