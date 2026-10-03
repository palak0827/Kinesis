import { createClient } from '@supabase/supabase-js';

// Read from frontend/.env
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

async function testSignup() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@kinesis.admin.com',
    password: 'Password123!',
  });

  if (error) {
    console.log('SUPABASE ERROR:', error);
  } else {
    console.log('SUCCESS:', data);
  }
}

testSignup();
