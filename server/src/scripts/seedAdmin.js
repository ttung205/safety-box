// npm run seed:admin – tạo (hoặc đặt lại mật khẩu) tài khoản admin từ ADMIN_EMAIL / ADMIN_PASSWORD trong .env
import bcrypt from 'bcrypt';
import { prisma } from '../prisma.js';

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const name = process.env.ADMIN_NAME || 'Quản trị viên';

try {
  if (!email || password.length < 8) {
    throw new Error('Cần ADMIN_EMAIL và ADMIN_PASSWORD (tối thiểu 8 ký tự) trong file .env');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name },
    update: { passwordHash, name },
  });
  console.log(`Đã tạo/cập nhật tài khoản admin: ${user.email}`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
