-- Optional image per add-on option (e.g. Rubber vs Leather bracelet thumbnail).
alter table product_addon_options
  add column if not exists image_url text;

comment on column product_addon_options.image_url is 'Optional image for this option; when set, product page shows it when option is selected.';
