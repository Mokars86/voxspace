-- WALLET MIGRATION

-- 1. Create Wallets Table
create table if not exists public.wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null unique,
  balance decimal(12, 2) default 0.00 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Wallets
alter table public.wallets enable row level security;
create policy "Users can view their own wallet" on public.wallets
  for select using (auth.uid() = user_id);
create policy "Users can update their own wallet" on public.wallets
    for update using (auth.uid() = user_id);


-- 2. Create Transactions Table
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  wallet_id uuid references public.wallets(id) not null,
  amount decimal(12, 2) not null,
  type text not null check (type in ('deposit', 'withdrawal', 'transfer_in', 'transfer_out')),
  description text,
  related_user_id uuid references public.profiles(id), -- For transfers
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Transactions
alter table public.transactions enable row level security;
create policy "Users can view their own transactions" on public.transactions
  for select using (
    exists (
      select 1 from public.wallets
      where wallets.id = transactions.wallet_id
      and wallets.user_id = auth.uid()
    )
  );

-- 3. Trigger to create wallet for new users
create or replace function public.handle_new_user_wallet()
returns trigger as $$
begin
  insert into public.wallets (user_id, balance)
  values (new.id, 0.00);
  return new;
end;
$$ language plpgsql security definer;

-- Attach to loading of profiles (since we need profile to exist, 
-- but actually standard practice is usually on auth.users insert. 
-- However, we can also just do it on profile creation if that's the main flow)
-- Re-using the same flow as profiles:
create trigger on_profile_created_wallet
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_wallet();


-- 4. Backfill existing users
insert into public.wallets (user_id, balance)
select id, 0.00 from public.profiles
where id not in (select user_id from public.wallets);
