-- Không cho anon/authenticated truy cập bảng ứng dụng qua Supabase Data API.
-- Backend Prisma kết nối bằng role postgres nên vẫn truy cập được.
ALTER TABLE "devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "safe_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cards" ENABLE ROW LEVEL SECURITY;

-- Chỉ JWT đã đăng nhập mới được nghe private Realtime channel của dashboard.
CREATE POLICY "dashboard listen" ON "realtime"."messages"
    FOR SELECT TO authenticated
    USING (realtime.topic() = 'dashboard');
