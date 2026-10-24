import { execSync } from 'node:child_process';

// Chỉ reset project Postgres/Supabase dành riêng cho test.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Thiếu TEST_DATABASE_URL trỏ tới database test riêng.');
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: 'ignore',
  });
}
