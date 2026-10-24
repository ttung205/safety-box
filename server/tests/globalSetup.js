import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// DB test riêng (prisma/test.db), tạo lại từ đầu mỗi lần chạy test.
export default function setup() {
  const db = path.resolve(import.meta.dirname, '../prisma/test.db');
  for (const f of [db, `${db}-journal`]) fs.rmSync(f, { force: true });
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
}
