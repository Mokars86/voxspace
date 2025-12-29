-- Create a new storage bucket for stories
insert into storage.buckets (id, name, public)
values ('stories', 'stories', true);

-- Policy: Anyone can view stories media
create policy "Anyone can view stories media"
  on storage.objects for select
  using ( bucket_id = 'stories' );

-- Policy: Users can upload their own story media
create policy "Users can upload story media"
  on storage.objects for insert
  with check ( bucket_id = 'stories' and auth.uid() = owner );

-- Policy: Users can update their own story media
create policy "Users can update story media"
  on storage.objects for update
  using ( bucket_id = 'stories' and auth.uid() = owner );

-- Policy: Users can delete their own story media
create policy "Users can delete story media"
  on storage.objects for delete
  using ( bucket_id = 'stories' and auth.uid() = owner );
