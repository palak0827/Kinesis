import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('d:/Odoo/frontend/.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let url, key;
envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function checkDb() {
  const { data, error } = await supabase.from('members').select('*').limit(1);
  if (error) {
    console.error('DB ERROR:', error.message);
  } else {
    console.log('DB SUCCESS:', data);
  }
}

checkDb();
