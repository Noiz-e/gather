/**
 * One-time script to upload preset BGM files (MP3) to GCS.
 * Run with: npx tsx server/scripts/upload-preset-bgm.ts
 */
import { readFileSync } from 'fs';
import { resolve, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env
dotenv.config({ path: resolve(__dirname, '../.env') });

const GCS_BUCKET = (process.env.GCS_BUCKET || '').replace('gs://', '');
const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID || '';

if (!GCS_BUCKET) {
  console.error('GCS_BUCKET not set');
  process.exit(1);
}

const storage = new Storage({ projectId: GCS_PROJECT_ID });
const bucket = storage.bucket(GCS_BUCKET);

// Load desc2bgm mapping
const desc2bgm: Record<string, string> = JSON.parse(
  readFileSync(resolve(__dirname, '../dist/desc2bgm.json'), 'utf-8')
);

// Collect unique files to upload
const filesToUpload = new Set<string>();
for (const localPath of Object.values(desc2bgm)) {
  filesToUpload.add(localPath); // e.g. "bgm/piano.mp3"
}

function getContentType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  switch (ext) {
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    default: return 'application/octet-stream';
  }
}

async function main() {
  console.log(`Uploading ${filesToUpload.size} BGM files to GCS bucket: ${GCS_BUCKET}`);

  for (const relPath of filesToUpload) {
    // MP3 files are in server/dist/bgm/mp3/ directory
    const filename = basename(relPath); // e.g. "piano.mp3"
    const localFile = resolve(__dirname, '../dist/bgm/mp3', filename);
    const gcsPath = `killagent/preset-bgm/${filename}`;
    const contentType = getContentType(filename);

    console.log(`  Uploading ${filename} → ${gcsPath} ...`);
    try {
      const data = readFileSync(localFile);
      const blob = bucket.file(gcsPath);
      await blob.save(data, {
        contentType,
        metadata: { cacheControl: 'public, max-age=31536000' },
      });
      const url = `https://storage.googleapis.com/${GCS_BUCKET}/${gcsPath}`;
      console.log(`    ✓ ${url} (${(data.length / 1024 / 1024).toFixed(1)} MB)`);
    } catch (err) {
      console.error(`    ✗ Failed: ${err}`);
    }
  }

  console.log('Done!');
}

main();
