-- Site-wide configurator discount (0–100 percent off custom builds)
create table if not exists site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz default now()
);

insert into site_settings (key, value) values ('configurator_discount_percent', '0')
on conflict (key) do nothing;
