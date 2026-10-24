-- CreateTable
CREATE TABLE "devices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "state" TEXT,
    "ip" TEXT,
    "rssi" INTEGER,
    "fw" TEXT,
    "time_ok" BOOLEAN,
    "uptime" INTEGER,
    "free_heap" INTEGER,
    "last_seen_at" DATETIME,
    "cards_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "safe_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "device_id" INTEGER NOT NULL,
    "uid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "state" TEXT,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "occurred_at" DATETIME NOT NULL,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "safe_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cards" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "device_id" INTEGER NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cards_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_api_key_hash_key" ON "devices"("api_key_hash");

-- CreateIndex
CREATE INDEX "safe_events_type_idx" ON "safe_events"("type");

-- CreateIndex
CREATE INDEX "safe_events_severity_idx" ON "safe_events"("severity");

-- CreateIndex
CREATE INDEX "safe_events_occurred_at_idx" ON "safe_events"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "safe_events_device_id_uid_key" ON "safe_events"("device_id", "uid");

-- CreateIndex
CREATE UNIQUE INDEX "cards_device_id_uid_key" ON "cards"("device_id", "uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
