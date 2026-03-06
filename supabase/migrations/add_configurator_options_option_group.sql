-- Optional group label for configurator options. When set, customer UI shows options
-- in a single dropdown grouped by this label (e.g. "Roman Dials" with all Roman dial options).
alter table configurator_options
  add column if not exists option_group_en text,
  add column if not exists option_group_fr text;

comment on column configurator_options.option_group_en is 'Optional group label (EN) for dropdown grouping in configurator (e.g. Roman Dials).';
comment on column configurator_options.option_group_fr is 'Optional group label (FR) for dropdown grouping in configurator.';
