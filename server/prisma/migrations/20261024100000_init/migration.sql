CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "state" TEXT,
    "ip" TEXT,
    "rssi" INTEGER,
    "fw" TEXT,
    "time_ok" BOOLEAN,
    "uptime" INTEGER,
    "free_heap" INTEGER,
    "last_seen_at" TIMESTAMP(3),
    "cards_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "safe_events" (
    "id" SERIAL NOT NULL,
    "device_id" INTEGER NOT NULL,
    "uid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "state" TEXT,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "safe_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cards" (
    "id" SERIAL NOT NULL,
    "device_id" INTEGER NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devices_api_key_hash_key" ON "devices"("api_key_hash");
CREATE INDEX "safe_events_type_idx" ON "safe_events"("type");
CREATE INDEX "safe_events_severity_idx" ON "safe_events"("severity");
CREATE INDEX "safe_events_occurred_at_idx" ON "safe_events"("occurred_at");
CREATE UNIQUE INDEX "safe_events_device_id_uid_key" ON "safe_events"("device_id", "uid");
CREATE UNIQUE INDEX "cards_device_id_uid_key" ON "cards"("device_id", "uid");

ALTER TABLE "safe_events" ADD CONSTRAINT "safe_events_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cards" ADD CONSTRAINT "cards_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
