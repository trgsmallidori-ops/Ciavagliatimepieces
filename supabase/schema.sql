-- Ciavaglia Timepieces schema
create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  shipping_address text,
  city text,
  country text,
  postal_code text,
  preferences text,
  created_at timestamptz default now()
);

create table if not exists configurations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  type text not null,
  options jsonb,
  status text default 'pending',
  price numeric,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid references configurations,
  user_id uuid references auth.users,
  total numeric,
  status text,
  summary text,
  stripe_session_id text,
  customer_email text,
  shipping_name text,
  shipping_line1 text,
  shipping_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text,
  created_at timestamptz default now()
);

-- One order per Stripe session (webhook creates order only after verified payment)
create unique index if not exists orders_stripe_session_id_key on orders (stripe_session_id) where stripe_session_id is not null;

-- Watch categories (nav + product grouping). Slug used in URLs and products.category.
create table if not exists watch_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_en text not null,
  label_fr text not null,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists products (
  id text primary key,
  name text not null,
  description text,
  price numeric not null,
  image text,
  stock integer default 0,
  active boolean default true,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Multiple images per product (product.image remains primary/thumbnail).
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  url text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  product_id text not null,
  quantity integer default 1,
  price numeric,
  title text,
  image_url text,
  created_at timestamptz default now(),
  unique (user_id, product_id)
);

create table if not exists journal_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  body text,
  published_at timestamptz default now(),
  locale text default 'en',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Featured hero slides (landing page scroll). Admin sets images + copy + purchase URL.
create table if not exists featured_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  image_url_secondary text,
  title text,
  subtitle text,
  description text,
  link_url text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Configurator: steps (Function, Case, Dial, etc.) and options per step. Options can depend on a parent (e.g. Case options per Function).
create table if not exists configurator_steps (
  id uuid primary key default gen_random_uuid(),
  label_en text not null unique,
  label_fr text not null,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists configurator_options (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references configurator_steps(id) on delete cascade,
  parent_option_id uuid references configurator_options(id) on delete cascade,
  label_en text not null,
  label_fr text not null,
  letter text not null default 'A',
  price numeric not null default 0,
  image_url text,
  preview_image_url text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Optional add-ons per step (e.g. Frosted Finish on Case). Available only when specific options are selected.
create table if not exists configurator_addons (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references configurator_steps(id) on delete cascade,
  label_en text not null,
  label_fr text not null,
  price numeric not null default 0,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Which options (when selected) make this add-on available. Empty = available for no option (admin must assign).
create table if not exists configurator_addon_options (
  addon_id uuid not null references configurator_addons(id) on delete cascade,
  option_id uuid not null references configurator_options(id) on delete cascade,
  primary key (addon_id, option_id)
);

alter table watch_categories enable row level security;
alter table featured_slides enable row level security;
alter table configurator_steps enable row level security;
alter table configurator_options enable row level security;
alter table configurator_addons enable row level security;
alter table configurator_addon_options enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table journal_posts enable row level security;
alter table profiles enable row level security;
alter table configurations enable row level security;
alter table orders enable row level security;
alter table cart_items enable row level security;

-- Policies: drop if exists so this script is safe to re-run
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can view own configurations" on configurations;
create policy "Users can view own configurations" on configurations
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own configurations" on configurations;
create policy "Users can insert own configurations" on configurations
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can view own orders" on orders;
create policy "Users can view own orders" on orders
  for select using (auth.uid() = user_id);

drop policy if exists "Users can view own cart" on cart_items;
create policy "Users can view own cart" on cart_items
  for select using (auth.uid() = user_id);

drop policy if exists "Users can edit own cart" on cart_items;
create policy "Users can edit own cart" on cart_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own cart" on cart_items;
create policy "Users can update own cart" on cart_items
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own cart items" on cart_items;
create policy "Users can delete own cart items" on cart_items
  for delete using (auth.uid() = user_id);

drop policy if exists "Anyone can view watch categories" on watch_categories;
create policy "Anyone can view watch categories" on watch_categories
  for select using (true);

drop policy if exists "Anyone can view active products" on products;
create policy "Anyone can view active products" on products
  for select using (active = true);

drop policy if exists "Anyone can view product images" on product_images;
create policy "Anyone can view product images" on product_images
  for select using (true);

drop policy if exists "Anyone can view featured slides" on featured_slides;
create policy "Anyone can view featured slides" on featured_slides
  for select using (true);

drop policy if exists "Anyone can view configurator steps" on configurator_steps;
create policy "Anyone can view configurator steps" on configurator_steps
  for select using (true);

drop policy if exists "Anyone can view configurator options" on configurator_options;
create policy "Anyone can view configurator options" on configurator_options
  for select using (true);

drop policy if exists "Anyone can view configurator addons" on configurator_addons;
create policy "Anyone can view configurator addons" on configurator_addons
  for select using (true);

drop policy if exists "Anyone can view configurator addon options" on configurator_addon_options;
create policy "Anyone can view configurator addon options" on configurator_addon_options
  for select using (true);

drop policy if exists "Anyone can view journal posts" on journal_posts;
create policy "Anyone can view journal posts" on journal_posts
  for select using (true);

-- Seed watch categories (nav + admin). Run before products.
insert into watch_categories (slug, label_en, label_fr, sort_order)
values
  ('stealth', 'Stealth', 'Stealth', 1),
  ('sub-gmt', 'Sub/GMT', 'Sub/GMT', 2),
  ('chronograph', 'Chronograph', 'Chronographe', 3),
  ('44mm-diver', '44mm Diver', '44mm Diver', 4),
  ('others', 'Others+', 'Others+', 5),
  ('dj', 'DJ', 'DJ', 6),
  ('dd', 'DD', 'DD', 7),
  ('naut', 'Naut', 'Naut', 8),
  ('oak', 'Oak', 'Oak', 9),
  ('g-oak', 'G-OAK', 'G-OAK', 10),
  ('sky', 'Sky', 'Sky', 11)
on conflict (slug) do update set label_en = excluded.label_en, label_fr = excluded.label_fr, sort_order = excluded.sort_order;

-- Seed initial products (run once; safe to re-run)
insert into products (id, name, description, price, image, stock, active, category)
values
  ('stealth', 'Stealth', 'Dive watch with rotating bezel and bold markers.', 12900, '/images/hero-1.svg', 5, true, 'stealth'),
  ('chronograph', 'Chronograph', 'Column-wheel chronograph with subdials.', 15750, '/images/hero-2.svg', 3, true, 'chronograph'),
  ('sub-gmt', 'Sub/GMT', 'Dual-time with ceramic bezel.', 11800, '/images/hero-3.svg', 4, true, 'sub-gmt')
on conflict (id) do update set name = excluded.name, description = excluded.description, category = excluded.category;

-- Seed initial journal posts (run once; safe to re-run)
insert into journal_posts (id, title, excerpt, published_at, locale)
values
  ('a0000001-0000-4000-8000-000000000001'::uuid, 'Inside the studio', 'A glimpse at the artisans shaping every bevel and bridge.', now() - interval '10 days', 'en'),
  ('a0000001-0000-4000-8000-000000000002'::uuid, 'Choosing the right movement', 'Manual vs automatic vs tourbillon—how to pick your heartbeat.', now() - interval '40 days', 'en'),
  ('a0000001-0000-4000-8000-000000000003'::uuid, 'The language of straps', 'How leather, mesh, and alligator change the personality of a watch.', now() - interval '90 days', 'en')
on conflict (id) do update set title = excluded.title, excerpt = excluded.excerpt, published_at = excluded.published_at;

-- Seed configurator steps (admin can add more or edit labels).
insert into configurator_steps (label_en, label_fr, sort_order)
values
  ('Function', 'Fonction', 1),
  ('Case', 'Boîtier', 2),
  ('Dial', 'Cadran', 3),
  ('Hands', 'Aiguilles', 4),
  ('Strap', 'Bracelet', 5),
  ('Extra', 'Extra', 6)
on conflict (label_en) do update set label_fr = excluded.label_fr, sort_order = excluded.sort_order;
