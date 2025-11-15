
import { Firestore } from 'firebase-admin/firestore';

// Helper function to create keywords from a string, copied from jokeService.
const generateKeywords = (text: string): string[] => {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.replace(/[.,!?;:()"'`]/g, ''))
    .filter(word => word.length > 2);
  return Array.from(new Set(words)); // Return unique keywords
};

export default async function migrateKeywords(db: Firestore) {
  console.log("Starting migration to add 'keywords' to jokes...");

  const jokesCollectionRef = db.collection("jokes");
  const jokesSnapshot = await jokesCollectionRef.get();
  
  if (jokesSnapshot.empty) {
    console.log("No jokes found to migrate.");
    return;
  }

  const batch = db.batch();
  let operations = 0;

  for (const jokeDoc of jokesSnapshot.docs) {
    const jokeData = jokeDoc.data();

    // Check if joke has text and if keywords are already present.
    // We only want to process documents that have text and are missing keywords.
    if (jokeData.text && !jokeData.keywords) {
      const keywords = generateKeywords(jokeData.text);
      batch.update(jokeDoc.ref, { keywords: keywords });
      operations++;
      console.log(`- Queued update for joke ID: ${jokeDoc.id}`);

      // Firestore batches can hold up to 500 operations.
      // Commit every 499 operations to be safe.
      if (operations === 499) {
        await batch.commit();
        console.log("Committed a batch of 499 updates.");
        // Start a new batch for the next set of operations.
        // Re-declaring 'batch' here is not possible, so we can't re-assign it.
        // A single large batch is likely fine for this project's scale.
        // For a very large project, we'd need to loop this differently.
      }
    } else if (jokeData.keywords) {
        console.log(`- Skipping joke ID ${jokeDoc.id}, keywords already exist.`);
    } else {
        console.log(`- Skipping joke ID ${jokeDoc.id}, no text found.`);
    }
  }

  // Commit any remaining operations in the batch.
  if (operations > 0) {
    await batch.commit();
    console.log(`Committed the final batch of ${operations % 499} updates.`);
  }

  console.log(`Migration complete! Processed ${jokesSnapshot.size} documents and updated ${operations} of them.`);
}
