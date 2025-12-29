-- FIX WALLET RLS P0LICY
-- The previous migration missed the INSERT policy for transactions.

create policy "Users can insert their own transactions" 
on public.transactions 
for insert 
with check (
  exists (
    select 1 from public.wallets
    where wallets.id = transactions.wallet_id
    and wallets.user_id = auth.uid()
  )
);
