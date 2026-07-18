import SrtParser2 from 'srt-parser-2';

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

function srtTimeToSeconds(time: string): number {
  const [hours, minutes, rest] = time.split(':');
  const [seconds, milliseconds] = rest.split(',');

  return (
    Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(milliseconds) / 1000
  );
}

export function parseSubtitles(srtText: string): SubtitleCue[] {
  const parsed = parser.fromSrt(srtText) as ParsedSrtCue[];

  return parsed.map(
    (cue): SubtitleCue => ({
      id: Number(cue.id),
      start: srtTimeToSeconds(cue.startTime),
      end: srtTimeToSeconds(cue.endTime),
      text: cue.text,
    })
  );
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
