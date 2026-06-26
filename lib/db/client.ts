import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// HTTP ドライバ（neon-http）。サーバーレス関数からの単発クエリでは WebSocket Pool より
// 往復が少ない（HTTP は ~3 RT、WebSocket は接続確立で ~8 RT）。本アプリは db.transaction()
// を一切使わず（全クエリが単発 select / upsert / delete）、Better Auth の drizzle アダプタも
// transaction を実装しない（コアが no-op で patch）ため、interactive tx 非対応の neon-http で安全。
// 複数文を原子的に実行したくなったら db.batch([...]) を使う（neon-http 対応の implicit tx）。
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle({ client: sql });
