import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

// Load .env
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!getApps().length) {
  const creds = fs.readFileSync('./firebase-admin-credentials.json', { encoding: 'utf-8'})
  const serviceAccount = JSON.parse(creds);
  initializeApp({
    credential: cert(serviceAccount),
  });
}
const db = getFirestore();

const MIGRATIONS_COLLECTION = 'migrations';

async function getAppliedMigrations(): Promise<Set<string>> {
  const snapshot = await db.collection(MIGRATIONS_COLLECTION).get();
  return new Set(snapshot.docs.map(doc => doc.id));
}

async function applyMigration(name: string, fn: (db: FirebaseFirestore.Firestore) => Promise<void>) {
  console.log(`Running migration: ${name}`);
  await fn(db);
  await db.collection(MIGRATIONS_COLLECTION).doc(name).set({ appliedAt: new Date() });
  console.log(`Migration ${name} applied.`);
}

async function main() {
  const migrationsDir = path.join(__dirname);
  const files = fs.readdirSync(migrationsDir)
    .filter(f => /^\d+.*\.ts$/.test(f))
    .sort();

  const applied = await getAppliedMigrations();

  for (const file of files) {
    const migrationName = file.replace(/\.ts$/, '');
    if (applied.has(migrationName)) {
      console.log(`Skipping already applied migration: ${migrationName}`);
      continue;
    }
    const migrationPath = pathToFileURL(path.join(migrationsDir, file)).href;
    const migration = await import(migrationPath);
    await applyMigration(migrationName, migration.default);
  }
  console.log('All migrations complete.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});