import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  import.meta.env?.VITE_SUPABASE_URL ||
  'https://fvyzcdwmypnlyfkhsxci.supabase.co';

const supabaseKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_iioYFuBc9xG6dgh0vVlCAw_arWjoB-Y';

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
