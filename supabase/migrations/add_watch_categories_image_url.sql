-- Image for "Select your style" category cards on the home page
alter table watch_categories
  add column if not exists image_url text;
