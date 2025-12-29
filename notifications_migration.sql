-- NOTIFICATION PREFERENCES
create table if not exists public.notification_preferences (
  user_id uuid references public.profiles(id) not null primary key,
  email_notifications boolean default true,
  push_notifications boolean default true,
  marketing_notifications boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notification_preferences enable row level security;

create policy "Users can view own notification preferences" 
  on public.notification_preferences for select 
  using (auth.uid() = user_id);

create policy "Users can update own notification preferences" 
  on public.notification_preferences for update 
  using (auth.uid() = user_id);

create policy "Users can insert own notification preferences" 
  on public.notification_preferences for insert 
  with check (auth.uid() = user_id);

-- Trigger to create default preferences
create or replace function public.handle_new_user_prefs()
returns trigger as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_prefs
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_prefs();

-- Backfill
insert into public.notification_preferences (user_id)
select id from public.profiles
where id not in (select user_id from public.notification_preferences);
