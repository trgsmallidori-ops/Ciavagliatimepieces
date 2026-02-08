-- Product discount: when set, display original price crossed out and discount %
alter table products add column if not exists original_price numeric;
