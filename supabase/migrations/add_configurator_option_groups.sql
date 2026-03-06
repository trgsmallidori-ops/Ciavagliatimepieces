-- Groups for configurator options. Admin selects options via checkboxes, creates a group with name + image.
-- Options in the same group appear under one dropdown section in the customer configurator.
create table if not exists configurator_option_groups (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references configurator_steps(id) on delete cascade,
  label_en text not null,
  label_fr text not null,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists configurator_option_groups_step_id_idx on configurator_option_groups(step_id);

alter table configurator_options
  add column if not exists group_id uuid references configurator_option_groups(id) on delete set null;

create index if not exists configurator_options_group_id_idx on configurator_options(group_id);

comment on table configurator_option_groups is 'Named groups for configurator options (e.g. Roman Dials). Admin creates via checkboxes + Create group; group has name + image for customer dropdown.';
comment on column configurator_options.group_id is 'Optional: option belongs to this group for dropdown grouping.';

alter table configurator_option_groups enable row level security;

drop policy if exists "Anyone can view configurator option groups" on configurator_option_groups;
create policy "Anyone can view configurator option groups" on configurator_option_groups for select using (true);

drop policy if exists "Authenticated can manage configurator option groups" on configurator_option_groups;
create policy "Authenticated can manage configurator option groups" on configurator_option_groups for all using (true);
