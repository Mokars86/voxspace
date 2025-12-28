
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogjydrxxglkgvocqywzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nanlkcnh4Z2xrZ3ZvY3F5d3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTc3MTgsImV4cCI6MjA4MjQzMzcxOH0.FhhBvTZYuAn8jiWeDU7jqZze5lH3cJc-8unwvG0ZwGU';

export const supabase = createClient(supabaseUrl, supabaseKey);
