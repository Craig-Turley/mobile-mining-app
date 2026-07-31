import { StoredEntry } from "@/db/jmdict/types";
import { Entry } from "./entry.types";

export function mapStoredEntryToEntry(storedEntry: StoredEntry[]): Entry[] {
  return storedEntry.map((entry) => ({
    id: entry.id,
    kanji: JSON.parse(entry.kanjiJson),
    kana: JSON.parse(entry.kanaJson),
    sense: JSON.parse(entry.senseJson),
  }));
}
