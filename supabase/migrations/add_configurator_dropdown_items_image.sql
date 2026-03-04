-- Image for dropdown items (e.g. thumbnail for "Polished" / "Brushed" finish).
alter table configurator_dropdown_items
  add column if not exists image_url text;

comment on column configurator_dropdown_items.image_url is 'Optional image URL for this dropdown choice (uploaded via admin or URL).';
