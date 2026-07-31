import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/jmdict/schema.ts',
  out: './db/jmdict',
  dialect: 'sqlite',
  dbCredentials: {
    url: './dictionary_scripts/dictionaries/jmdict-v1.db',
  },
});
