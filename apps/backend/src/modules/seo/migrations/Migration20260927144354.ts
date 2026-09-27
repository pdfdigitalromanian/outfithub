import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260927144354 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seo_entry" drop constraint if exists "seo_entry_resource_type_resource_id_unique";`);
    this.addSql(`create table if not exists "seo_entry" ("id" text not null, "resource_type" text check ("resource_type" in ('product', 'collection', 'category')) not null, "resource_id" text not null, "meta_title" text null, "meta_description" text null, "og_image" text null, "canonical_path" text null, "image_alts" jsonb null, "noindex" boolean not null default false, "manual_fields" jsonb null, "issues" jsonb null, "generated_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seo_entry_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seo_entry_deleted_at" ON "seo_entry" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seo_entry_resource_type_resource_id_unique" ON "seo_entry" ("resource_type", "resource_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seo_entry" cascade;`);
  }

}
