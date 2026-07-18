import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./db/app/schema/files.ts', './db/app/schema/models.ts'],
  out: './drizzle/files',
  dialect: 'sqlite',
  driver: 'expo',
});
