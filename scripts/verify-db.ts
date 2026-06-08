import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db/client';

async function main() {
  console.log('Connecting to database...');
  const result = await db.execute(sql`SELECT 1 AS ok`);
  console.log('Result:', result.rows);
  console.log('✅ DB connection OK');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ DB connection FAILED');
  console.error(err);
  process.exit(1);
});
