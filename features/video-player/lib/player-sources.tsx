export type LocalMediaSource = {
  type: 'local';
  videoId: number;
};

/**
 * @type captions: JSON.stringify(YoutubeCaptions)
 * @type videoId: string 
 */
export type YoutubeMediaSource = {
  type: 'youtube';
  captions: string;
  videoId: string;
};

export type MediaSource = LocalMediaSource | YoutubeMediaSource;
