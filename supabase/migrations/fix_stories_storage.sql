-- 1. Ensure the 'stories' bucket exists
insert into storage.buckets (id, name, public)
values ('stories', 'stories', true)
on conflict (id) do update set public = true;

-- 2. Drop existing policies to ensure a clean slate
drop policy if exists "Anyone can view stories media" on storage.objects;
drop policy if exists "Users can upload story media" on storage.objects;
drop policy if exists "Users can update story media" on storage.objects;
drop policy if exists "Users can delete story media" on storage.objects;

-- 3. Re-create Policies

-- Allow public read access to the stories bucket
create policy "Anyone can view stories media"
  on storage.objects for select
  using ( bucket_id = 'stories' );

-- Allow authenticated users to upload to the stories bucket ('stories' folder or root)
-- We check that the user is authenticated and the bucket matches.
-- Note: 'owner' is automatically set to auth.uid() by Supabase on insert.
create policy "Users can upload story media"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'stories' and owner = auth.uid() );

-- Allow users to update/delete their own files
create policy "Users can update story media"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'stories' and owner = auth.uid() );

create policy "Users can delete story media"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'stories' and owner = auth.uid() );
