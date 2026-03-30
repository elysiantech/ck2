/**
 * Prompt cache - stores prebaked responses in PostgreSQL
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface CachedPrompt {
  mode: string;
  prompt: string;
  items: Array<{ id: string; type: string; [key: string]: unknown }>;
  cached_at: Date;
}

export async function getCachedPrompt(mode: string, prompt: string): Promise<CachedPrompt | null> {
  const rows = await sql`
    SELECT mode, prompt, items, cached_at
    FROM cached_prompts
    WHERE mode = ${mode} AND prompt = ${prompt}
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    mode: row.mode,
    prompt: row.prompt,
    items: row.items,
    cached_at: new Date(row.cached_at),
  };
}

export async function setCachedPrompt(
  mode: string,
  prompt: string,
  items: Array<{ id: string; type: string; [key: string]: unknown }>
): Promise<void> {
  await sql`
    INSERT INTO cached_prompts (mode, prompt, items)
    VALUES (${mode}, ${prompt}, ${JSON.stringify(items)})
    ON CONFLICT (mode, prompt) DO UPDATE SET
      items = EXCLUDED.items,
      cached_at = NOW()
  `;
}
