-- SECURE TRANSFER FUNDS RPC
-- This function handles the atomic transfer of funds between two users.

create or replace function public.transfer_funds(recipient_username text, amount decimal)
returns json
language plpgsql
security definer
as $$
declare
  sender_id uuid;
  sender_wallet_id uuid;
  sender_balance decimal;
  recipient_id uuid;
  recipient_wallet_id uuid;
  recipient_balance decimal;
begin
  -- 1. Get Sender Info (from auth)
  sender_id := auth.uid();
  if sender_id is null then
    return json_build_object('success', false, 'message', 'Not authenticated');
  end if;

  select id, balance into sender_wallet_id, sender_balance
  from public.wallets
  where user_id = sender_id
  for update; -- Lock row

  if sender_wallet_id is null then
    return json_build_object('success', false, 'message', 'Sender wallet not found');
  end if;

  if sender_balance < amount then
     return json_build_object('success', false, 'message', 'Insufficient funds');
  end if;

  -- 2. Get Recipient Info
  select id into recipient_id
  from public.profiles
  where username = recipient_username;

  if recipient_id is null then
     return json_build_object('success', false, 'message', 'Recipient not found');
  end if;

  if recipient_id = sender_id then
     return json_build_object('success', false, 'message', 'Cannot send to self');
  end if;

  select id, balance into recipient_wallet_id, recipient_balance
  from public.wallets
  where user_id = recipient_id
  for update; -- Lock row

  if recipient_wallet_id is null then
     return json_build_object('success', false, 'message', 'Recipient wallet not initialized');
  end if;

  -- 3. Perform Transfer
  update public.wallets
  set balance = balance - amount, updated_at = now()
  where id = sender_wallet_id;

  update public.wallets
  set balance = balance + amount, updated_at = now()
  where id = recipient_wallet_id;

  -- 4. Record Transactions
  -- Sender Record
  insert into public.transactions (wallet_id, amount, type, description, related_user_id)
  values (sender_wallet_id, amount, 'transfer_out', 'Sent to @' || recipient_username, recipient_id);

  -- Recipient Record
  insert into public.transactions (wallet_id, amount, type, description, related_user_id)
  values (
    recipient_wallet_id, 
    amount, 
    'transfer_in', 
    'Received from @' || (select username from public.profiles where id = sender_id),
    sender_id
  );

  return json_build_object('success', true, 'message', 'Transfer successful', 'new_balance', sender_balance - amount);

exception when others then
  return json_build_object('success', false, 'message', 'Transaction failed: ' || SQLERRM);
end;
$$;
