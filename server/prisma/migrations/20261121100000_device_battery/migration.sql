-- Phần trăm pin dự phòng và trạng thái chạy pin, két gửi lên theo từng nhịp heartbeat.
ALTER TABLE "devices" ADD COLUMN "batt_pct" INTEGER;
ALTER TABLE "devices" ADD COLUMN "on_battery" BOOLEAN;
