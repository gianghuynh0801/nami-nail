/**
 * Script to generate vi.json from en.json using LibreTranslate API.
 * Source language: English (en). Target: Vietnamese (vi).
 *
 * Usage:
 *   LIBRETRANSLATE_URL=https://libretranslate.com LIBRETRANSLATE_API_KEY=your_key npx tsx scripts/translate-locale.ts
 *
 * Or self-hosted (no API key):
 *   LIBRETRANSLATE_URL=http://localhost:5000 npx tsx scripts/translate-locale.ts
 *
 * Set SKIP_TRANSLATE=1 to just copy en -> vi (no API calls), e.g. for structure sync.
 */

import * as fs from 'fs';
import * as path from 'path';

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const SOURCE_FILE = path.join(MESSAGES_DIR, 'en.json');
const TARGET_FILE = path.join(MESSAGES_DIR, 'vi.json');
const SOURCE_LOCALE = 'en';
const TARGET_LOCALE = 'vi';

const BASE_URL = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com';
const API_KEY = process.env.LIBRETRANSLATE_API_KEY || '';
const SKIP_TRANSLATE = process.env.SKIP_TRANSLATE === '1';

async function translateText(text: string): Promise<string> {
  if (SKIP_TRANSLATE) return text;

  const body: Record<string, string | number> = {
    q: text,
    source: SOURCE_LOCALE,
    target: TARGET_LOCALE,
  };
  if (API_KEY) body.api_key = API_KEY;

  const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LibreTranslate error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as { translatedText?: string };
  return data.translatedText ?? text;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function translateObject(
  obj: Record<string, unknown>,
  delayMs: number = 200
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const translated = await translateText(value);
      out[key] = translated;
      await new Promise((r) => setTimeout(r, delayMs));
    } else if (isPlainObject(value)) {
      out[key] = await translateObject(value as Record<string, unknown>, delayMs);
    } else {
      out[key] = value;
    }
  }

  return out;
}

async function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error('Source file not found:', SOURCE_FILE);
    process.exit(1);
  }

  const source = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf-8')) as Record<string, unknown>;
  console.log('Translating en -> vi', SKIP_TRANSLATE ? '(SKIP_TRANSLATE=1, copying only)' : `(API: ${BASE_URL})`);

  const translated = await translateObject(source);
  fs.writeFileSync(TARGET_FILE, JSON.stringify(translated, null, 2), 'utf-8');
  console.log('Written:', TARGET_FILE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
