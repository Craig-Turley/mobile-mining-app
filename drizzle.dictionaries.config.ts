import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/dictionaries/schema.ts',
  out: './drizzle/dictionaries',
  dialect: 'sqlite',
  driver: 'expo',
});
