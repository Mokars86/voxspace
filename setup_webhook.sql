-- Create a trigger to call the edge function on new message insert

-- 1. Create the function that calls the Edge Function
create or replace function public.handle_new_message_notification()
returns trigger as $$
declare
  response_status int;
begin
  -- Make a POST request to your Edge Function
  -- REPLACE 'YOUR_PROJECT_REF' with your actual Supabase project ref or full URL if locally developing
  -- For production, it's typically: https://<project_ref>.supabase.co/functions/v1/push-notification
  -- BUT since we are using Database Webhooks (net extension), we can use the UI to set this up easier.
  -- HOWEVER, doing it via SQL requires the pg_net extension.
  
  -- SIMPLER APPROACH:
  -- We will rely on Supabase Dashboard -> Database -> Webhooks to configure this to avoid complex SQL for http calls.
  -- OR we can use the native Supabase "Database Webhooks" feature which is configured in the Dashboard or via API.
  
  -- Since I cannot access the dashboard, I will write a SQL that enables the trigger assuming the extension exists OR provide instructions.
  
  -- ACTUALLY, the standard way in Supabase now is using 'supabase functions' and a dedicated Trigger is simpler if we use the 'pg_net' extension.
  
  perform
    net.http_post(
      url := 'https://ogjydrxxglkgvocqywzb.supabase.co/functions/v1/push-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nanlkcnh4Z2xrZ3ZvY3F5d3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTc3MTgsImV4cCI6MjA4MjQzMzcxOH0.FhhBvTZYuAn8jiWeDU7jqZze5lH3cJc-8unwvG0ZwGU"}'::jsonb,
      body := jsonb_build_object(
        'record', row_to_json(new),
        'type', 'INSERT',
        'table', 'messages',
        'schema', 'public'
      )
    );
    
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the Trigger
-- NOTE: You must enable pg_net extension in your database first: create extension if not exists "pg_net";
create trigger on_new_message_push
  after insert on public.messages
  for each row execute procedure public.handle_new_message_notification();
