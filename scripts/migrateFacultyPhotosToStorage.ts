import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const url = process.env.SUPABASE_URL || 'https://aasktchpxsxxanfkkrxx.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

if (!key) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required for storage migration.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function runMigration() {
  console.log('🚀 Starting safe faculty photo migration to Supabase Storage...');

  // 1. Ensure bucket exists and is public
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some(b => b.name === 'faculty-photos');
  if (!exists) {
    const { error: bErr } = await supabase.storage.createBucket('faculty-photos', { public: true });
    if (bErr) {
      console.error('Failed to create bucket:', bErr);
      process.exit(1);
    }
    console.log('✅ Created public bucket: faculty-photos');
  } else {
    console.log('✅ Bucket faculty-photos already exists.');
  }

  // 2. Fetch all faculty
  const { data: facultyList, error: fErr } = await supabase
    .from('faculty')
    .select('id, name, short_name, photo_url');

  if (fErr || !facultyList) {
    console.error('Failed to query faculty table:', fErr);
    process.exit(1);
  }

  console.log(`Found ${facultyList.length} faculty members.`);

  // 3. Backup original data locally before any modification
  const backupDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, 'faculty-photos-backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(facultyList, null, 2), 'utf-8');
  console.log(`💾 Backed up original faculty records to ${backupPath}`);

  // 4. Migrate each Base64 photo
  const migrated: { id: string; name: string; oldLen: number; newUrl: string }[] = [];

  for (const fac of facultyList) {
    const photo = fac.photo_url || '';
    if (!photo.startsWith('data:image/')) {
      console.log(`⏩ Skipping ${fac.name} (${fac.id}): Already URL or empty (len=${photo.length})`);
      continue;
    }

    const match = photo.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!match) {
      console.warn(`⚠️ Could not parse data URL for ${fac.name} (${fac.id})`);
      continue;
    }

    const subtype = match[1].toLowerCase();
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = subtype === 'jpeg' ? 'jpg' : subtype;
    const filename = `${fac.id}.${ext}`;
    const contentType = `image/${subtype}`;

    console.log(`Uploading ${fac.name} (${fac.id}): ${buffer.length} bytes as ${filename}...`);

    const { error: uploadError } = await supabase.storage
      .from('faculty-photos')
      .upload(filename, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`❌ Failed to upload photo for ${fac.name}:`, uploadError);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from('faculty-photos')
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    // Verify reachable via HTTP
    try {
      const verifyRes = await fetch(publicUrl);
      if (!verifyRes.ok) {
        throw new Error(`HTTP ${verifyRes.status}`);
      }
      console.log(`✅ Verified public URL accessible for ${fac.name} (HTTP ${verifyRes.status})`);
    } catch (vErr: any) {
      console.error(`❌ Verification failed for ${publicUrl}:`, vErr.message);
      continue; // Do NOT update database if verification failed
    }

    // Update Supabase PostgreSQL record
    const { error: updateError } = await supabase
      .from('faculty')
      .update({ photo_url: publicUrl })
      .eq('id', fac.id);

    if (updateError) {
      console.error(`❌ Failed to update Supabase row for ${fac.name}:`, updateError);
      continue;
    }

    migrated.push({
      id: fac.id,
      name: fac.name,
      oldLen: photo.length,
      newUrl: publicUrl,
    });
    console.log(`🎉 Migrated ${fac.name} -> ${publicUrl}`);
  }

  // 5. Update local database.json mirror
  const dbFile = path.join(backupDir, 'database.json');
  if (fs.existsSync(dbFile)) {
    try {
      const localDb = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
      if (Array.isArray(localDb.faculty)) {
        for (const m of migrated) {
          const item = localDb.faculty.find((f: any) => f.id === m.id);
          if (item) {
            item.photoUrl = m.newUrl;
          }
        }
        fs.writeFileSync(dbFile, JSON.stringify(localDb, null, 2), 'utf-8');
        console.log(`✅ Updated local database.json with migrated URLs.`);
      }
    } catch (e: any) {
      console.warn(`Note updating local database.json:`, e?.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`Migration Summary:`);
  console.log(`Successfully migrated ${migrated.length} faculty photos to Supabase Storage.`);
  migrated.forEach(m => {
    console.log(`- ${m.name} (${m.id}): ${(m.oldLen / 1024).toFixed(1)} KB Base64 -> ${m.newUrl}`);
  });
  console.log(`========================================\n`);

  // 6. Test final faculty table payload size
  const { data: finalFaculty } = await supabase.from('faculty').select('*');
  const finalBytes = Buffer.byteLength(JSON.stringify(finalFaculty || []));
  console.log(`📊 New total Supabase faculty table payload size: ${(finalBytes / 1024).toFixed(1)} KB (was 1,577.8 KB)`);
}

runMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
