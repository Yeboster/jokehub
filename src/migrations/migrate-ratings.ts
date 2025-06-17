
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Joke } from "../lib/types";
import { submitUserRating } from "../services/ratingService";

async function migrateOwnerRatings() {
  const jokesCollectionRef = collection(db, "jokes");
  const jokesSnapshot = await getDocs(jokesCollectionRef);

  for (const jokeDoc of jokesSnapshot.docs) {
    const joke = jokeDoc.data() as Joke;
    if (joke.funnyRate > 0) {
      await submitUserRating(joke.id, joke.funnyRate, joke.userId);
    }
  }
  console.log("Migration complete!");
}

migrateOwnerRatings();
