/**
 * Sync the hotel catalog from LiteAPI into hotels_catalog.
 *
 * "Best way" to keep a big, always-updated hotel list inside the system:
 * pull real hotels (with LiteAPI ids) per country and upsert them, instead
 * of hardcoding. Re-run on a schedule (weekly cron) to stay fresh.
 *
 * Writes via the Supabase service client (SUPABASE_URL + SUPABASE_SERVICE_KEY).
 * The hotels_catalog table must exist first (see migrations/hotels-catalog.sql).
 *
 * Usage:
 *   node scripts/sync-hotels.js            # uses TARGETS below
 *   node scripts/sync-hotels.js US 500     # single country + max count
 *   node scripts/sync-hotels.js BR 0       # 0 = all hotels for that country
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getHotels, liteApiConfigured } from '../liteApi.js';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Country -> how many hotels to pull. 0 = all. Numbers are starting targets.
const TARGETS = [
  { country: 'US', max: 500 },
  { country: 'BR', max: 300 },
  { country: 'GB', max: 250 },
  { country: 'FR', max: 200 },
  { country: 'IT', max: 200 },
  { country: 'ES', max: 200 },
  { country: 'PT', max: 100 },
  { country: 'DE', max: 150 },
];

const PAGE = 200; // LiteAPI page size

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function upsert(rows) {
  if (!rows.length) return 0;
  const { error } = await supabase
    .from('hotels_catalog')
    .upsert(
      rows.map(h => ({
        liteapi_id: h.id,
        name: h.name,
        country_code: h.countryCode,
        city: h.city,
        stars: h.stars,
        lat: h.lat,
        lng: h.lng,
        source: 'liteapi',
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'liteapi_id' },
    );
  if (error) throw new Error(error.message);
  return rows.length;
}

async function syncCountry(country, max) {
  let offset = 0, total = 0;
  for (;;) {
    const limit = max ? Math.min(PAGE, max - total) : PAGE;
    if (limit <= 0) break;
    const hotels = await getHotels({ countryCode: country, limit, offset });
    if (!hotels.length) break;
    total += await upsert(hotels);
    offset += hotels.length;
    console.log(`[sync] ${country}: ${total} hotels`);
    if (hotels.length < limit) break; // no more pages
  }
  return total;
}

async function main() {
  if (!liteApiConfigured()) { console.error('Set LITEAPI_KEY first.'); process.exit(1); }
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY.'); process.exit(1); }

  const [argCountry, argMax] = process.argv.slice(2);
  const targets = argCountry
    ? [{ country: argCountry.toUpperCase(), max: Number(argMax || 0) }]
    : TARGETS;

  let grand = 0;
  for (const t of targets) {
    try { grand += await syncCountry(t.country, t.max); }
    catch (e) { console.error(`[sync] ${t.country} failed:`, e.message); }
  }
  console.log(`[sync] done — ${grand} hotels processed.`);
}

main();
