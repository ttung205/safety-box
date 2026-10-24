// npm run seed:admin – tạo (hoặc đặt lại mật khẩu) tài khoản admin trên Supabase Auth.
import { supabase } from '../supabase.js';

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const name = process.env.ADMIN_NAME || 'Quản trị viên';

try {
  if (!email || password.length < 8) {
    throw new Error('Cần ADMIN_EMAIL và ADMIN_PASSWORD (tối thiểu 8 ký tự) trong file .env');
  }
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const existing = listed.users.find((u) => u.email?.toLowerCase() === email);
  const result = existing
    ? await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: { name } })
    : await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (result.error) throw result.error;
  const user = result.data.user;
  console.log(`Đã tạo/cập nhật tài khoản admin: ${user.email}`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
