-- Set layer_z_index on all configurator options by step (bottom → top: strap, case, bezel, dial, hands, extra).
-- Only updates options whose step has the given step_key; does not touch function/size or other steps.

update configurator_options
set layer_z_index = 10
from configurator_steps
where configurator_options.step_id = configurator_steps.id
  and configurator_steps.step_key = 'strap';

update configurator_options
set layer_z_index = 20
from configurator_steps
where configurator_options.step_id = configurator_steps.id
  and configurator_steps.step_key = 'case';

update configurator_options
set layer_z_index = 30
from configurator_steps
where configurator_options.step_id = configurator_steps.id
  and configurator_steps.step_key = 'bezel';

update configurator_options
set layer_z_index = 40
from configurator_steps
where configurator_options.step_id = configurator_steps.id
  and configurator_steps.step_key = 'dial';

update configurator_options
set layer_z_index = 50
from configurator_steps
where configurator_options.step_id = configurator_steps.id
  and configurator_steps.step_key = 'hands';

update configurator_options
set layer_z_index = 51
from configurator_steps
where configurator_options.step_id = configurator_steps.id
  and configurator_steps.step_key = 'extra';
