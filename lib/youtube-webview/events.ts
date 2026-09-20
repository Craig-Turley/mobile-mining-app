export type YoutubeWebviewEvent = WatchNavigation | TimedText | YoutubeWebviewError | Reset;

type WatchNavigation = {
  tag: 'watch';
  videoId: string;
  url: string;
};

type TimedText = {
  tag: 'timedtext';
  transport: 'fetch' | 'xhr';
  url: string;
  videoId: string;
  contentType: string | null;
  body: string;
};

type YoutubeWebviewError = {
  tag: 'error';
  transport: 'fetch' | 'xhr';
  message: string;
};

type Reset = {
  tag: 'reset';
};
