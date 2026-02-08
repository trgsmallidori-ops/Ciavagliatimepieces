-- Add specifications field for product detail page (admin can add specs per watch)
alter table products add column if not exists specifications text;
