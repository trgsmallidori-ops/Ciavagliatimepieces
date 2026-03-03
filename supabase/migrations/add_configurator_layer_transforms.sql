-- Layer position/scale per function and step so admin adjustments apply to customer configurator.
create table if not exists configurator_layer_transforms (
  function_option_id uuid not null references configurator_options(id) on delete cascade,
  step_id uuid not null references configurator_steps(id) on delete cascade,
  offset_x real not null default 0,
  offset_y real not null default 0,
  scale real not null default 1,
  primary key (function_option_id, step_id)
);

comment on table configurator_layer_transforms is 'Per (watch type, step) layer position and scale for configurator preview; set in admin, used in public configurator.';

alter table configurator_layer_transforms enable row level security;

create policy "Anyone can view configurator layer transforms"
  on configurator_layer_transforms for select using (true);

create policy "Authenticated can manage configurator layer transforms"
  on configurator_layer_transforms for all using (auth.role() = 'authenticated');
