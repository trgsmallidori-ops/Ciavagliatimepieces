-- Link product_addons back to addon_templates so we can pre-check which products have each add-on
alter table product_addons
  add column if not exists addon_template_id uuid references addon_templates(id) on delete set null;

create unique index if not exists product_addons_product_template_unique
  on product_addons (product_id, addon_template_id)
  where addon_template_id is not null;
