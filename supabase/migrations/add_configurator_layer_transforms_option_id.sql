-- Allow per-option (e.g. per color) layer transforms, not just per step.
-- Keeps backward compatibility by migrating existing per-step transforms as option_id = NULL.

alter table configurator_layer_transforms rename to configurator_layer_transforms_old;

create table if not exists configurator_layer_transforms (
  function_option_id uuid not null references configurator_options(id) on delete cascade,
  step_id uuid not null references configurator_steps(id) on delete cascade,
  -- When null: default transform for the step (legacy behavior).
  -- When set: transform specific to the selected option (e.g. a specific case color).
  option_id uuid null references configurator_options(id) on delete cascade,
  offset_x real not null default 0,
  offset_y real not null default 0,
  scale real not null default 1
);

-- One default transform per (function, step)
create unique index if not exists configurator_layer_transforms_default_unique
  on configurator_layer_transforms (function_option_id, step_id)
  where option_id is null;

-- One option-specific transform per (function, step, option)
create unique index if not exists configurator_layer_transforms_option_unique
  on configurator_layer_transforms (function_option_id, step_id, option_id)
  where option_id is not null;

insert into configurator_layer_transforms (function_option_id, step_id, option_id, offset_x, offset_y, scale)
select function_option_id, step_id, null, offset_x, offset_y, scale
from configurator_layer_transforms_old;

drop table configurator_layer_transforms_old;

comment on table configurator_layer_transforms is 'Per (watch type, step, optional selected option) layer position and scale for configurator preview; set in admin, used in public configurator.';

alter table configurator_layer_transforms enable row level security;

drop policy if exists "Anyone can view configurator layer transforms" on configurator_layer_transforms;
create policy "Anyone can view configurator layer transforms"
  on configurator_layer_transforms for select using (true);

drop policy if exists "Authenticated can manage configurator layer transforms" on configurator_layer_transforms;
create policy "Authenticated can manage configurator layer transforms"
  on configurator_layer_transforms for all using (auth.role() = 'authenticated');

