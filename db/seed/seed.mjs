#!/usr/bin/env node
/**
 * Seed loader — content/modules/*.json → Supabase.
 *
 * Idempotent: re-running is safe. Every row uses a stable UUID from the
 * JSON file, and we upsert on those UUIDs. Order indexes are derived from
 * the JSON array position.
 *
 * Required env (read from .env.local via `node --env-file`):
 *   SUPABASE_URL                  — your project URL
 *   SUPABASE_SERVICE_ROLE_KEY     — service role key (bypasses RLS)
 *
 * Run:
 *   npm run db:seed
 *
 * The script does NOT run migrations. Migrations are applied via the
 * Supabase dashboard or the Supabase CLI — see db/README.md.
 */

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', '..', 'content', 'modules');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    console.error('Did you create .env.local from .env.example?');
    process.exit(1);
  }
  return v;
}

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SERVICE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function loadModuleFiles() {
  const files = (await readdir(MODULES_DIR)).filter((f) => f.endsWith('.json'));
  const modules = [];
  for (const f of files) {
    const raw = await readFile(join(MODULES_DIR, f), 'utf-8');
    modules.push(JSON.parse(raw));
  }
  return modules;
}

async function upsertModule(mod) {
  const { error } = await supa.from('module').upsert(
    {
      id: mod.uuid,
      slug: mod.id,
      title: mod.title,
      category: mod.category,
      difficulty: mod.difficulty,
      cultural_note: mod.culturalNote ?? '',
      order_index: mod.orderIndex ?? 0,
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(`module ${mod.id}: ${error.message}`);
}

async function upsertVocab(mod) {
  if (!mod.vocabulary?.length) return;

  // 1. Upsert every vocab row.
  const vocabRows = mod.vocabulary.map((v) => ({
    id: v.id,
    swahili: v.swahili,
    english: v.english,
    example_context: v.exampleContext ?? '',
    sanifu: v.sanifu ?? null,
    sanifu_note: v.sanifuNote ?? null,
    part_of_speech: v.partOfSpeech ?? null,
    noun_class: v.nounClass ?? null,
    tense: v.tense ?? null,
    category: mod.category,
    difficulty: mod.difficulty,
    audio_url: v.audioUrl ?? null,
  }));
  const { error: vErr } = await supa
    .from('vocab_entry')
    .upsert(vocabRows, { onConflict: 'id' });
  if (vErr) throw new Error(`vocab for ${mod.id}: ${vErr.message}`);

  // 2. Upsert the M2M link rows.
  const linkRows = mod.vocabulary.map((v, idx) => ({
    module_id: mod.uuid,
    vocab_id: v.id,
    order_index: idx,
  }));
  const { error: lErr } = await supa
    .from('module_vocab')
    .upsert(linkRows, { onConflict: 'module_id,vocab_id' });
  if (lErr) throw new Error(`module_vocab for ${mod.id}: ${lErr.message}`);
}

async function upsertExchange(mod) {
  if (!mod.exchange?.length) return;
  const rows = mod.exchange.map((line, idx) => ({
    id: line.id,
    module_id: mod.uuid,
    order_index: idx,
    speaker: line.speaker,
    swahili: line.swahili,
    english: line.english,
    sanifu: line.sanifu ?? null,
    sanifu_note: line.sanifuNote ?? null,
    audio_url: line.audioUrl ?? null,
  }));
  const { error } = await supa
    .from('exchange_line')
    .upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`exchange for ${mod.id}: ${error.message}`);
}

async function upsertExercises(mod) {
  if (!mod.exercises?.length) return;
  const rows = mod.exercises.map((ex, idx) => {
    // payload = everything except the id and type discriminator
    const { id, type, ...payload } = ex;
    return {
      id,
      module_id: mod.uuid,
      order_index: idx,
      kind: type,
      payload,
    };
  });
  const { error } = await supa
    .from('exercise')
    .upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`exercises for ${mod.id}: ${error.message}`);
}

async function main() {
  console.log(`Seeding from ${MODULES_DIR}`);
  const modules = await loadModuleFiles();
  console.log(`Found ${modules.length} module file(s).`);

  for (const mod of modules) {
    if (!mod.uuid) {
      throw new Error(
        `Module ${mod.id} is missing a UUID. Every authoring file needs a top-level "uuid" field.`,
      );
    }
    process.stdout.write(`  ${mod.id} … `);
    await upsertModule(mod);
    await upsertVocab(mod);
    await upsertExchange(mod);
    await upsertExercises(mod);
    console.log(
      `ok (${mod.vocabulary?.length ?? 0} vocab, ${mod.exchange?.length ?? 0} exchange, ${mod.exercises?.length ?? 0} exercises)`,
    );
  }
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
