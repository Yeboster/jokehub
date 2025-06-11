
import {
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserRating } from '@/lib/types';

const JOKE_RATINGS_COLLECTION = 'jokeRatings';

export async function submitUserRating(
  jokeId: string,
  ratingValue: number,
  userId: string,
  comment?: string
) {
  if (ratingValue < 1 || ratingValue > 5) {
    throw new Error('Rating must be between 1 and 5 stars.');
  }

  const ratingsCollectionRef = collection(db, JOKE_RATINGS_COLLECTION);
  const q = query(
    ratingsCollectionRef,
    where('jokeId', '==', jokeId),
    where('userId', '==', userId)
  );

  const querySnapshot = await getDocs(q);
  const now = Timestamp.now();
  const ratingData: any = {
    jokeId,
    userId,
    ratingValue,
    updatedAt: now,
    comment: null,
  };

  if (comment && comment.trim() !== '') {
    ratingData.comment = comment.trim();
  }

  if (!querySnapshot.empty) {
    const existingRatingDocRef = querySnapshot.docs[0].ref;
    await updateDoc(existingRatingDocRef, ratingData);
  } else {
    ratingData.createdAt = now;
    await addDoc(ratingsCollectionRef, ratingData);
  }
}

export async function getUserRatingForJoke(
  jokeId: string,
  userId: string
): Promise<UserRating | null> {
  const ratingsCollectionRef = collection(db, JOKE_RATINGS_COLLECTION);
  const q = query(
    ratingsCollectionRef,
    where('jokeId', '==', jokeId),
    where('userId', '==', userId),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const docData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...docData,
      createdAt: (docData.createdAt as Timestamp).toDate(),
      updatedAt: (docData.updatedAt as Timestamp).toDate(),
    } as UserRating;
  }
  return null;
}
