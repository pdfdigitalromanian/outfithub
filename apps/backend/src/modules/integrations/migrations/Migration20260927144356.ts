import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260927144356 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "sameday_locker" drop constraint if exists "sameday_locker_locker_id_unique";`);
    this.addSql(`alter table if exists "integration_connection" drop constraint if exists "integration_connection_provider_unique";`);
    this.addSql(`alter table if exists "channel_sync" drop constraint if exists "channel_sync_provider_product_id_unique";`);
    this.addSql(`create table if not exists "channel_sync" ("id" text not null, "provider" text not null, "product_id" text not null, "action" text check ("action" in ('upsert', 'delete')) not null default 'upsert', "status" text check ("status" in ('pending', 'processing', 'synced', 'error', 'skipped', 'removed')) not null default 'pending', "external_id" text null, "external_data" jsonb null, "payload_hash" text null, "attempts" integer not null default 0, "last_error" text null, "issues" jsonb null, "last_synced_at" timestamptz null, "next_attempt_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "channel_sync_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_channel_sync_deleted_at" ON "channel_sync" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_channel_sync_provider_product_id_unique" ON "channel_sync" ("provider", "product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_channel_sync_status_next_attempt_at" ON "channel_sync" ("status", "next_attempt_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "integration_connection" ("id" text not null, "provider" text not null, "enabled" boolean not null default false, "config" jsonb null, "secrets_encrypted" text null, "status" text check ("status" in ('not_configured', 'authorization_required', 'connected', 'error')) not null default 'not_configured', "status_message" text null, "last_checked_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "integration_connection_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_integration_connection_provider_unique" ON "integration_connection" ("provider") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_connection_deleted_at" ON "integration_connection" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "integration_log" ("id" text not null, "provider" text not null, "level" text check ("level" in ('info', 'warn', 'error')) not null default 'info', "message" text not null, "context" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "integration_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_log_deleted_at" ON "integration_log" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_log_provider_created_at" ON "integration_log" ("provider", "created_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "sameday_locker" ("id" text not null, "locker_id" text not null, "name" text not null, "type" text not null default 'locker', "county" text null, "city" text null, "address" text null, "postal_code" text null, "lat" real null, "lng" real null, "schedule" jsonb null, "search_text" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "sameday_locker_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_sameday_locker_locker_id_unique" ON "sameday_locker" ("locker_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sameday_locker_deleted_at" ON "sameday_locker" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sameday_locker_city" ON "sameday_locker" ("city") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "sameday_shipment" ("id" text not null, "order_id" text not null, "fulfillment_id" text null, "awb_number" text null, "awb_cost" real null, "service_id" integer null, "locker_id" text null, "parcels" jsonb null, "status" text check ("status" in ('pending', 'created', 'in_transit', 'delivered', 'canceled', 'error', 'returned')) not null default 'pending', "status_label" text null, "history" jsonb null, "last_error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "sameday_shipment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sameday_shipment_deleted_at" ON "sameday_shipment" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sameday_shipment_order_id" ON "sameday_shipment" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sameday_shipment_awb_number" ON "sameday_shipment" ("awb_number") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "channel_sync" cascade;`);

    this.addSql(`drop table if exists "integration_connection" cascade;`);

    this.addSql(`drop table if exists "integration_log" cascade;`);

    this.addSql(`drop table if exists "sameday_locker" cascade;`);

    this.addSql(`drop table if exists "sameday_shipment" cascade;`);
  }

}
