import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/files/schema.ts',
  out: './drizzle/files',
  dialect: 'sqlite',
  driver: 'expo'
});

