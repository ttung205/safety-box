import { supabase } from '../supabase.js';

export async function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });

  try {
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) throw error || new Error('Token không hợp lệ');
    req.user = { id: data.claims.sub, email: data.claims.email };
    next();
  } catch {
    res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  }
}
