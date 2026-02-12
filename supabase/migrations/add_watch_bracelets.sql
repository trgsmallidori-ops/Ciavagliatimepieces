-- Reusable watch bracelets (e.g. Rubber Blue, Oist, Jub, Presi). Admin creates once, then assigns to products.
create table if not exists watch_bracelets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists watch_bracelets_sort_order_idx on watch_bracelets(sort_order);

-- Which bracelets are available for which products (many-to-many).
create table if not exists product_bracelets (
  product_id text not null references products(id) on delete cascade,
  bracelet_id uuid not null references watch_bracelets(id) on delete cascade,
  sort_order int default 0,
  primary key (product_id, bracelet_id)
);

create index if not exists product_bracelets_product_id_idx on product_bracelets(product_id);
create index if not exists product_bracelets_bracelet_id_idx on product_bracelets(bracelet_id);

alter table watch_bracelets enable row level security;
alter table product_bracelets enable row level security;

create policy "Anyone can view watch bracelets"
  on watch_bracelets for select using (true);

create policy "Anyone can view product bracelets"
  on product_bracelets for select using (true);

comment on table watch_bracelets is 'Reusable bracelet styles. Admin creates here, then assigns to products via product_bracelets.';
comment on table product_bracelets is 'Junction: which bracelets are offered for each product.';
