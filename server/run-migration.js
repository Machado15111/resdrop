import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.log('[Migration] No DATABASE_URL — skipping migration');
  process.exit(0);
}

const sql = postgres(connectionString, { ssl: 'require', connect_timeout: 15 });

try {
  // Users table columns
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
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_savings NUMERIC DEFAULT 0`;
  console.log('+ total_savings (users)');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS confirmed_savings NUMERIC DEFAULT 0`;
  console.log('+ confirmed_savings (users)');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bookings_count INTEGER DEFAULT 0`;
  console.log('+ bookings_count');

  // Sessions table
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
    )
  `;
  console.log('+ sessions table');
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(user_email)`;

  // Password resets table
  await sql`
    CREATE TABLE IF NOT EXISTS password_resets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 hour'),
      used BOOLEAN DEFAULT false
    )
  `;
  console.log('+ password_resets table');
  await sql`CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)`;

  console.log('\n✓ Migration complete');
} catch (e) {
  console.error('Migration error:', e.message);
} finally {
  await sql.end();
}
