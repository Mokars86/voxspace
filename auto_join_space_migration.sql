-- AUTO JOIN SPACE MIGRATION
-- 1. Create a function to automatically add the creator as a member
create or replace function public.handle_new_space()
returns trigger as $$
begin
  insert into public.space_members (space_id, user_id)
  values (new.id, new.owner_id);
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger
drop trigger if exists on_space_created on public.spaces;
create trigger on_space_created
  after insert on public.spaces
  for each row execute procedure public.handle_new_space();

-- 3. Ensure RLS allows owners to delete their spaces
-- (This might already exist, but safe to re-assert or ensure)
drop policy if exists "Users can delete their own spaces" on public.spaces;
create policy "Users can delete their own spaces"
  on public.spaces for delete
  using (auth.uid() = owner_id);
