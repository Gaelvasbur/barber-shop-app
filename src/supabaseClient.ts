import { createClient } from '@supabase/supabase-js'

// environment variable defined as string or return an empty string
const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// the client gets created
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
