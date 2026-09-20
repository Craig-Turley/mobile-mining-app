import SrtParser2 from 'srt-parser-2';
import { YoutubeCaption } from '../youtube-webview';

const parser = new SrtParser2();

type ParsedSrtCue = {
  id: string;
  startTime: string;
  endTime: string;
  text: string;
};

export interface SubtitleCue {
  id: number;
  start: number;
  end: number;
  text: string;
}

export function parseSubtitles(srtText: string): SubtitleCue[] {
  const parsed = parser.fromSrt(srtText) as ParsedSrtCue[];

  return parsed.map((cue): SubtitleCue => ({
    id: Number(cue.id),
    start: srtTimeToSeconds(cue.startTime),
    end: srtTimeToSeconds(cue.endTime),
    text: cue.text,
  }));
}

export function parseYoutubeSubtitles(captions: YoutubeCaption[]): SubtitleCue[] {
  const sorted = captions
    .filter((caption) => caption.text.trim().length > 0)
    .sort((a, b) => a.startMs - b.startMs);

  const merged: YoutubeCaption[] = [];

  for (const caption of sorted) {
    const previous = merged.at(-1);

    if (previous && previous.startMs === caption.startMs) {
      const previousEnd = previous.startMs + previous.durationMs;
      const captionEnd = caption.startMs + caption.durationMs;

      previous.text = `${previous.text}\n${caption.text}`;
      previous.durationMs = Math.max(previousEnd, captionEnd) - previous.startMs;
    } else {
      merged.push({ ...caption });
    }
  }

  return merged.map((caption, index) => {
    const startMs = caption.startMs;
    const naturalEndMs = caption.startMs + caption.durationMs;
    const nextStartMs = merged[index + 1]?.startMs;

    const endMs = nextStartMs !== undefined ? Math.min(naturalEndMs, nextStartMs) : naturalEndMs;

    return {
      id: index,
      start: startMs / 1000,
      end: endMs / 1000,
      text: caption.text,
    };
  });
}

export function secondsToTime(rawSeconds: number): string {
  const totalSeconds = Math.floor(rawSeconds);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedSeconds = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const paddedMinutes = String(minutes).padStart(2, '0');
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

function srtTimeToSeconds(time: string): number {
  const [hours, minutes, rest] = time.split(':');
  const [seconds, milliseconds] = rest.split(',');

  return (
    Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(milliseconds) / 1000
  );
}
