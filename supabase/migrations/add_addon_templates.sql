-- Add-on library: define add-ons (name, image, options with prices/images) then apply to products.
create table if not exists addon_templates (
  id uuid primary key default gen_random_uuid(),
  label_en text not null,
  label_fr text not null,
  image_url text not null default '/images/hero-1.svg',
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists addon_template_options (
  id uuid primary key default gen_random_uuid(),
  addon_template_id uuid not null references addon_templates(id) on delete cascade,
  label_en text not null,
  label_fr text not null,
  price numeric not null default 0,
  image_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists addon_template_options_template_id_idx on addon_template_options(addon_template_id);

alter table addon_templates enable row level security;
alter table addon_template_options enable row level security;

create policy "Admin can manage addon_templates" on addon_templates for all using (true);
create policy "Admin can manage addon_template_options" on addon_template_options for all using (true);

comment on table addon_templates is 'Add-on library: create add-ons with options here, then apply to selected products.';
comment on table addon_template_options is 'Options (styles, prices, images) for each add-on template.';
