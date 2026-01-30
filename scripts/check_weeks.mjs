import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log('Checking weeks for 2025-11 and 2026-01...');
  const { data, error } = await supabase
    .from('mwb_weeks')
    .select('issue_key, week_date, content, language')
    .in('issue_key', ['2025-11', '2026-01'])
    .eq('language', 'pt-BR')
    .order('week_date');
  
  if (error) {
    console.error('Error:', error);
  } else {
    // Check for specific target weeks
    const targetWeeks = ['2025-12-29', '2026-02-23'];
    
    // Check missing weeks
    targetWeeks.forEach(date => {
        const found = data.find(w => w.week_date === date);
        if (found) {
            console.log(`[FOUND] Week ${date}`);
        } else {
            console.log(`[MISSING] Week ${date}`);
        }
    });

    // Check language content
     console.log('\nChecking content language...');
     if (data.length > 0) {
        console.log('Sample content keys:', Object.keys(data[0].content || {}));
        console.log('Sample content excerpt:', JSON.stringify(data[0].content).substring(0, 500));
     }

     data.forEach(w => {
        const contentStr = JSON.stringify(w.content || {});
        const isEnglish = contentStr.includes('Song') || contentStr.includes('Prayer') || contentStr.includes('Opening Comments');
        const isPortuguese = contentStr.includes('Cântico') || contentStr.includes('Oração') || contentStr.includes('Comentários iniciais');
        
        let status = 'UNKNOWN';
        if (isEnglish) status = 'ENGLISH DETECTED';
        if (isPortuguese) status = 'PORTUGUESE';
        if (isEnglish && isPortuguese) status = 'MIXED (WARN)';
        
        console.log(`${w.week_date} (${w.issue_key}): ${status}`);
    });
  }
}

check();
