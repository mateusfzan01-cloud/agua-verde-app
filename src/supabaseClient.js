import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yblywknncmrbtxyhwbzr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibHl3a25uY21yYnR4eWh3YnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzAyMTUsImV4cCI6MjA3OTgwNjIxNX0.yd_XUaXuc2g2uU3F8ouG0_U_6eHTmFiZ6oMwvkfjpZ8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
