import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qsjshbjetgihpcjxptgm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzanNoYmpldGdpaHBjanhwdGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzcwMTEsImV4cCI6MjA4NDAxMzAxMX0.0nP7p61qZneBtuFju0wGHitqUBlUiTOIL_L1baym7ow';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

