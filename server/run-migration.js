import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

// Try multiple pooler regions
const regions = ['us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1', 'sa-east-1'];

async function tryConnect() {
  for (const region of regions) {
    const pgUrl = `postgresql://postgres.${projectRef}:${serviceKey}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    console.log(`Trying ${region}...`);
    const sql = postgres(pgUrl, { ssl: 'require', connect_timeout: 10 });
    try {
      const result = await sql`SELECT 1 as test`;
      console.log(`Connected via ${region}!`);
      return sql;
    } catch (e) {
      console.log(`  ${region} failed: ${e.message.substring(0, 80)}`);
      await sql.end();
    }
  }
  return null;
}

const sql = await tryConnect();
if (!sql) {
  console.error('Could not connect to any Supabase pooler region');
  process.exit(1);
}

try {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  console.log('+ password_hash');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false`;
  console.log('+ onboarding_completed');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`;
  console.log('+ phone');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL'`;
  console.log('+ currency');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT`;
  console.log('+ country');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS traveler_type TEXT`;
  console.log('+ traveler_type');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_email TEXT`;
  console.log('+ preferred_email');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN DEFAULT true`;
  console.log('+ alerts_enabled');

  await sql`CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
  )`;
  console.log('+ sessions table');
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(user_email)`;
  console.log('+ session indexes');

  await sql`CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 hour'),
    used BOOLEAN DEFAULT false
  )`;
  console.log('+ password_resets table');
  await sql`CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)`;
  console.log('+ password_resets index');

  console.log('\nMigration complete!');
} catch (e) {
  console.error('Migration error:', e.message);
} finally {
  await sql.end();
}
