import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mjqovcqcutjqzcjifmjs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcW92Y3FjdXRqcXpjamlmbWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjM3MjMsImV4cCI6MjA3MDczOTcyM30.QL3jBW61MrKrWnnaMNpVTuujTl9WIJnehXKJ6dcypMk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)