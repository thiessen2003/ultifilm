import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Fall back to placeholder values so createClient doesn't throw when env vars
// are absent (e.g. on Vercel without credentials set). ServiceProvider already
// detects missing vars and switches to mock repositories before any Supabase
// call is made, so this client is never actually used in that case.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-anon-key',
)
