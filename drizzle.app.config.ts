import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './db/app/schema/files.ts',
    './db/app/schema/models.ts',
    './db/app/schema/decks.ts',
    './db/app/schema/queue.ts',
    './db/app/schema/defaults.ts',
  ],
  out: './drizzle/app',
  dialect: 'sqlite',
  driver: 'expo',
});
