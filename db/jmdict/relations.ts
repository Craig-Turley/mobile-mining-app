import { relations } from "drizzle-orm/relations";
import { entries, lookup } from "./schema";

export const lookupRelations = relations(lookup, ({one}) => ({
	entry: one(entries, {
		fields: [lookup.entryId],
		references: [entries.id]
	}),
}));

export const entriesRelations = relations(entries, ({many}) => ({
	lookups: many(lookup),
}));