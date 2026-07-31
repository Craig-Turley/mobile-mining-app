import type { entries, lookup } from './schema';

export type StoredEntry = typeof entries.$inferSelect;
export type StoredLookup = typeof lookup.$inferSelect;
