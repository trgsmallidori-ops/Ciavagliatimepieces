-- Optional discount per configurator option (0 = no discount).
-- When set, effective price = price * (1 - discount_percent/100).
alter table configurator_options
  add column if not exists discount_percent numeric default 0;

comment on column configurator_options.discount_percent is 'Optional discount percentage (0-100). Applied at configurator and checkout.';
