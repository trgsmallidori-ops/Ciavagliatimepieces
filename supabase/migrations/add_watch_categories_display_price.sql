-- Optional price to show on home "Select your style" category card
alter table watch_categories
  add column if not exists display_price numeric;
