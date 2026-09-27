import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260927144353 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "content_page" drop constraint if exists "content_page_handle_unique";`);
    this.addSql(`alter table if exists "content_entry" drop constraint if exists "content_entry_key_unique";`);
    this.addSql(`create table if not exists "content_entry" ("id" text not null, "key" text not null, "value" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_entry_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_entry_key_unique" ON "content_entry" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_entry_deleted_at" ON "content_entry" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_page" ("id" text not null, "handle" text not null, "title" text not null, "body" text not null, "seo_title" text null, "seo_description" text null, "is_legal" boolean not null default false, "published" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_page_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_page_handle_unique" ON "content_page" ("handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_page_deleted_at" ON "content_page" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "content_entry" cascade;`);

    this.addSql(`drop table if exists "content_page" cascade;`);
  }

}
