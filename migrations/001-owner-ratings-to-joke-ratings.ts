
import { Joke } from "@/lib/types";
import { Firestore, Timestamp } from 'firebase-admin/firestore';

export default async function migrateOwnerRatings(db: Firestore) {
  const jokesCollectionRef = db.collection("jokes");
  const jokesSnapshot = await jokesCollectionRef.get()
  const jokeRatingsCollectionRef = db.collection("jokeRatings");

  for (const jokeDoc of jokesSnapshot.docs) {
    console.log(`Processing joke ${jokeDoc.id}`)
    const joke = jokeDoc.data() as Joke;
    if (joke.funnyRate > 0) {
      const existingRatingQuery = jokeRatingsCollectionRef
        .where('jokeId', '==', jokeDoc.id)
        .where('userId', '==', joke.userId)
        .limit(1)
      const existingRatingSnapshot = await existingRatingQuery.get();
      if (existingRatingSnapshot.empty) {
        const newRating = {
          jokeId: jokeDoc.id,
          userId: joke.userId,
          ratingValue: joke.funnyRate,
          comment: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await jokeRatingsCollectionRef.add(newRating);
      }

      // Update the average rating of the joke
      const allRatingsQuery = jokeRatingsCollectionRef.where('jokeId', '==', jokeDoc.id);
      const allRatingsSnapshot = await allRatingsQuery.get();
      let totalRating = 0;
      allRatingsSnapshot.docs.forEach(ratingDoc => {
        totalRating += ratingDoc.data().rating;
      });
      await jokeDoc.ref.update({
        averageRating: totalRating / allRatingsSnapshot.docs.length,
        ratingCount: allRatingsSnapshot.docs.length,
      });
    }
  }
  console.log("Migration complete!");
}
