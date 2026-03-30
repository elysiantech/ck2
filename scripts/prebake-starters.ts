/**
 * Pre-bake starter prompt responses
 *
 * Runs each starter prompt through the API and saves to the database.
 *
 * Usage: npx ts-node scripts/prebake-starters.ts
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const API_URL = process.env.API_URL || 'http://localhost:3000/api/chat';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

interface StarterPrompt {
  key: string;
  mode: 'automation' | 'intralogistics';
  prompt: string;
}

const STARTERS: StarterPrompt[] = [
  // Automation mode
  {
    key: 'automation-labor',
    mode: 'automation',
    prompt: "We can't keep people on the line. Half my workforce is temp labor and I'm tired of managing the churn."
  },
  {
    key: 'automation-palletizing',
    mode: 'automation',
    prompt: "I want to see if a palletizing robot pencils out for my operation. We run two shifts, about 3 operators on the line."
  },
  {
    key: 'automation-walkthrough',
    mode: 'automation',
    prompt: "Walk me through what automation would look like for my process. I'm not sure where to start."
  },
  {
    key: 'automation-machine-tending',
    mode: 'automation',
    prompt: "How much does it cost to automate machine tending? I have CNC mills running 2 shifts."
  },
  // Intralogistics mode
  {
    key: 'intralogistics-labor',
    mode: 'intralogistics',
    prompt: "We can't keep pickers. Turnover is constant and every peak season we're scrambling for temp labor that doesn't show up."
  },
  {
    key: 'intralogistics-cube-storage',
    mode: 'intralogistics',
    prompt: "I keep hearing about these robotic cube storage systems. We ship about 3,000 order lines a day out of an 80,000 square foot building. Is that kind of system right for us?"
  },
  {
    key: 'intralogistics-walkthrough',
    mode: 'intralogistics',
    prompt: "Walk me through what automation options exist for our operation. I'm not sure where to start or what fits."
  },
  {
    key: 'intralogistics-amr',
    mode: 'intralogistics',
    prompt: "What does an AMR system actually cost, fully installed? We have about 20 pickers across two shifts."
  }
];

interface ThreadItem {
  id: string;
  type: string;
  [key: string]: unknown;
}

async function runPrompt(starter: StarterPrompt): Promise<ThreadItem[]> {
  console.log(`\n[${starter.key}] Running prompt...`);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'x-workflow-mode': starter.mode,
      'x-bypass-cache': 'true'
    },
    body: JSON.stringify({
      type: 'threads.create',
      params: {
        input: {
          content: [{ type: 'input_text', text: starter.prompt }],
          attachments: [],
          quoted_text: null
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const itemsMap = new Map<string, ThreadItem>();
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);

          // Track items as they're created/added
          if ((event.type === 'thread.item.created' || event.type === 'thread.item.added') && event.item) {
            itemsMap.set(event.item.id, event.item);
          }

          // Apply updates to existing items
          if (event.type === 'thread.item.updated' && event.item_id && event.update) {
            const item = itemsMap.get(event.item_id);
            if (item) {
              // Handle assistant_message content updates
              if (item.type === 'assistant_message' && event.update.type === 'assistant_message.content_part.done') {
                const idx = event.update.content_index ?? 0;
                if (!item.content) item.content = [];
                (item.content as unknown[])[idx] = event.update.content;
              }
              // Handle workflow updates
              if (item.type === 'workflow' && event.update.task) {
                const workflow = item.workflow as { type: string; tasks: unknown[] } | undefined;
                if (!workflow) item.workflow = { type: 'reasoning', tasks: [] };
                const taskIdx = event.update.task_index ?? 0;
                const wf = item.workflow as { type: string; tasks: unknown[] };
                if (!wf.tasks) wf.tasks = [];
                wf.tasks[taskIdx] = event.update.task;
              }
            }
          }

          // Finalize items with done event (may have more complete data)
          if (event.type === 'thread.item.done' && event.item) {
            itemsMap.set(event.item.id, event.item);
            console.log(`  [${starter.key}] Got item: ${event.item.type} (${event.item.id})`);
          }
        } catch (e) {
          // Skip non-JSON lines
        }
      }
    }
  }

  const items = Array.from(itemsMap.values());
  console.log(`[${starter.key}] Collected ${items.length} items`);
  return items;
}

async function main() {
  console.log('Pre-baking starter prompt responses...\n');
  console.log(`API: ${API_URL}`);

  // Create table if not exists
  await sql`
    CREATE TABLE IF NOT EXISTS cached_prompts (
      mode TEXT NOT NULL,
      prompt TEXT NOT NULL,
      items JSONB NOT NULL,
      cached_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (mode, prompt)
    )
  `;
  console.log('Table ready.\n');

  let cached = 0;

  for (const starter of STARTERS) {
    try {
      const items = await runPrompt(starter);

      // Write to database
      await sql`
        INSERT INTO cached_prompts (mode, prompt, items)
        VALUES (${starter.mode}, ${starter.prompt}, ${JSON.stringify(items)})
        ON CONFLICT (mode, prompt) DO UPDATE SET
          items = EXCLUDED.items,
          cached_at = NOW()
      `;

      console.log(`[${starter.key}] Saved to database`);
      cached++;
    } catch (error) {
      console.error(`[${starter.key}] Failed:`, error);
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nCached ${cached} of ${STARTERS.length} prompts to database`);
}

main().catch(console.error);
