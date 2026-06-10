// scripts/seed-reset.ts
import { Pool } from '@neondatabase/serverless';

const USER_ID = process.env.SEED_USER_ID;
if (!USER_ID) {
  console.error(
    'SEED_USER_ID が未設定です。`SEED_USER_ID=<your-user-id> npm run db:seed:reset` で実行してください。',
  );
  process.exit(1);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env.local');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const mbti = await pool.query(
    'DELETE FROM mbti_snapshots WHERE user_id = $1',
    [USER_ID],
  );
  const insights = await pool.query(
    'DELETE FROM weekly_insights WHERE user_id = $1',
    [USER_ID],
  );
  const entries = await pool.query(
    'DELETE FROM diary_entries WHERE user_id = $1',
    [USER_ID],
  );

  await pool.end();

  console.log(
    `✅ Deleted ${mbti.rowCount} mbti_snapshots, ${insights.rowCount} weekly_insights and ${entries.rowCount} diary_entries for user "${USER_ID}"`,
  );
}

main().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
