import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Check these values to ensure they're not undefined
console.log('supabaseUrl =', supabaseUrl);
console.log('supabaseAnonKey =', supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
