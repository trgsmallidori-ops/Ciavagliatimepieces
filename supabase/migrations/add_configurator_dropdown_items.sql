-- Dropdown sub-options for configurator options (e.g. "Case: Yellow Gold" can have dropdown items like "Polished", "Brushed").
-- When an option has at least one dropdown item, the customer sees a dropdown after selecting that option; selection affects style and price.
create table if not exists configurator_dropdown_items (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references configurator_options(id) on delete cascade,
  label_en text not null,
  label_fr text not null,
  price numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists configurator_dropdown_items_option_id_idx on configurator_dropdown_items(option_id);

alter table configurator_dropdown_items enable row level security;

drop policy if exists "Anyone can view configurator dropdown items" on configurator_dropdown_items;
create policy "Anyone can view configurator dropdown items" on configurator_dropdown_items
  for select using (true);

drop policy if exists "Authenticated can manage configurator dropdown items" on configurator_dropdown_items;
create policy "Authenticated can manage configurator dropdown items" on configurator_dropdown_items
  for all using (auth.role() = 'authenticated');

comment on table configurator_dropdown_items is 'Sub-options shown in a dropdown when a configurator option is selected (e.g. finish type for a case colour). Admin can add dropdowns to any step/option.';
