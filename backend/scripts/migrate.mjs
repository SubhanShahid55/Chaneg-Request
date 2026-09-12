import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');

async function runMigrations() {
  console.log('📦 ChangeFlow Automated Migration Runner');
  console.log('─────────────────────────────────────────');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s) in ${path.relative(process.cwd(), MIGRATIONS_DIR)}`);

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DIRECT_URL;

  let isPlaceholder = false;
  try {
    const parsed = new URL(connectionString);
    if (parsed.host === 'host:port' || parsed.hostname === 'host' || parsed.username === 'user') {
      isPlaceholder = true;
    }
  } catch {
    isPlaceholder = true;
  }

  if (!connectionString || isPlaceholder) {
    console.log('\n⚠️  DATABASE_URL contains placeholder values or is not configured.');
    console.log('Migration files found and ready to be applied:');
    files.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
    console.log('\nTo apply migrations automatically against your Supabase PostgreSQL instance:');
    console.log('  Set a valid DATABASE_URL in .env (e.g. postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres)');
    console.log('  Then run: npm run migrate\n');
    return;
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL database.\n');

    // Create schema tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id serial PRIMARY KEY,
        name text NOT NULL UNIQUE,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const { rows } = await client.query('SELECT name FROM _migrations;');
    const appliedSet = new Set(rows.map((r) => r.name));

    let appliedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏩  Skipping already applied: ${file}`);
        continue;
      }

      console.log(`⏳ Applying: ${file}...`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1);', [file]);
        await client.query('COMMIT');
        console.log(`✓ Applied: ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed applying migration: ${file}`);
        console.error(err);
        process.exit(1);
      }
    }

    console.log(`\n🎉 Migration complete! ${appliedCount} new migration(s) applied.`);
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
