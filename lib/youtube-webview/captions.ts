export type YoutubeCaptions = {
  videoId: string;
  captions: YoutubeCaption[];
};

export type YoutubeCaption = {
  startMs: number;
  durationMs: number;
  text: string;
};

export function normalizeYoutubeCaptions(events: YoutubeCaptionEvent[]): YoutubeCaption[] {
  return events.flatMap((event) => {
    if (!event.segs) {
      return [];
    }

    const text = event.segs.map((segment) => segment.utf8).join('');

    if (!text.trim() || text === '\n') {
      return [];
    }

    return [
      {
        startMs: event.tStartMs,
        durationMs: event.dDurationMs ?? 0,
        text,
      },
    ];
  });
}

// NOTE: below is the raw youtube types
export type YoutubeCaptionSegment = {
  utf8: string;
  tOffsetMs?: number;
  acAsrConf?: number;
  isSpeakerChange?: number;
};

export type YoutubeCaptionEvent = {
  tStartMs: number;
  dDurationMs?: number;

  segs?: YoutubeCaptionSegment[];

  id?: number;
  wWinId?: number;
  wpWinPosId?: number;
  wsWinStyleId?: number;
  aAppend?: number;
};
