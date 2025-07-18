
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  where,
  limit,
  getDocs,
  getDoc,
  startAfter,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Joke, Category } from '@/lib/types';
import { ensureCategoryExists } from './categoryService';

const JOKES_COLLECTION = 'jokes';
const PAGE_SIZE = 10;

export interface FilterParams {
  selectedCategories: string[];
  filterFunnyRate: number;
  usageStatus: 'all' | 'used' | 'unused'; // Changed from showOnlyUsed
  scope: 'public' | 'user';
}

function buildJokesQuery(
  filters: FilterParams,
  userId?: string,
  lastVisibleJokeDoc?: QueryDocumentSnapshot | null
) {
  if (filters.scope === 'user' && !userId) {
    return null;
  }

  const queryConstraints = [];

  if (filters.scope === 'user' && userId) {
    queryConstraints.push(where('userId', '==', userId));
  }

  if (filters.selectedCategories.length > 0) {
    queryConstraints.push(where('category', 'in', filters.selectedCategories.slice(0, 30)));
  }

  if (filters.filterFunnyRate !== -1) {
    queryConstraints.push(where('funnyRate', '==', filters.filterFunnyRate));
  }

  // Updated logic for usageStatus
  if (filters.usageStatus === 'used') {
    queryConstraints.push(where('used', '==', true));
  } else if (filters.usageStatus === 'unused') {
    queryConstraints.push(where('used', '==', false));
  }
  // If 'all', no filter is applied for 'used' status

  queryConstraints.push(orderBy('dateAdded', 'desc'));

  if (lastVisibleJokeDoc) {
    queryConstraints.push(startAfter(lastVisibleJokeDoc));
  }

  queryConstraints.push(limit(PAGE_SIZE));

  return query(collection(db, JOKES_COLLECTION), ...queryConstraints);
}

export async function fetchJokes(
  filters: FilterParams,
  userId?: string,
  lastVisibleJokeDoc?: QueryDocumentSnapshot | null
) {
  const q = buildJokesQuery(filters, userId, lastVisibleJokeDoc);
  if (!q) {
    return { jokes: [], lastVisible: null, hasMore: false };
  }

  const snapshot = await getDocs(q);
  const jokes = snapshot.docs.map(
    (docSnapshot) =>
      ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
        dateAdded: (docSnapshot.data().dateAdded as Timestamp).toDate(),
      } as Joke)
  );

  const lastVisible = snapshot.docs[snapshot.docs.length - 1] ?? null;
  const hasMore = snapshot.docs.length === PAGE_SIZE;

  return { jokes, lastVisible, hasMore };
}

export async function addJoke(
  newJokeData: { text: string; category: string; funnyRate?: number },
  userId: string
) {
  const finalCategoryName = await ensureCategoryExists(newJokeData.category, userId);
  await addDoc(collection(db, JOKES_COLLECTION), {
    ...newJokeData,
    category: finalCategoryName,
    funnyRate: newJokeData.funnyRate ?? 0,
    dateAdded: Timestamp.now(),
    used: false,
    userId: userId,
  });
}

export async function importJokes(
  importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[],
  userId: string
) {
  const batch = writeBatch(db);
  const categoriesToEnsure = new Set<string>();
  importedJokesData.forEach((joke) => categoriesToEnsure.add(joke.category.trim()));

  for (const catName of categoriesToEnsure) {
    if (catName) await ensureCategoryExists(catName, userId);
  }

  for (const jokeData of importedJokesData) {
    const finalCategoryName = jokeData.category.trim();
    if (!finalCategoryName) {
      console.warn('Skipping joke with empty category:', jokeData.text);
      continue;
    }
    const docRef = doc(collection(db, JOKES_COLLECTION));
    batch.set(docRef, {
      ...jokeData,
      category: finalCategoryName,
      funnyRate: jokeData.funnyRate ?? 0,
      dateAdded: Timestamp.now(),
      used: false,
      userId: userId,
    });
  }
  await batch.commit();
}

async function getJokeDoc(jokeId: string) {
    const jokeDocRef = doc(db, JOKES_COLLECTION, jokeId);
    const docSnap = await getDoc(jokeDocRef);
    if (!docSnap.exists()) {
      throw new Error('Joke not found.');
    }
    return { ref: jokeDocRef, data: docSnap.data() };
  }
  
  export async function toggleJokeUsed(jokeId: string, userId: string) {
    const { ref, data } = await getJokeDoc(jokeId);
    if (data.userId !== userId) {
      throw new Error('You can only update your own jokes.');
    }
    await updateDoc(ref, { used: !data.used });
  }
  
  export async function rateJoke(jokeId: string, rating: number, userId: string) {
    const { ref, data } = await getJokeDoc(jokeId);
    if (data.userId !== userId) {
      throw new Error('You can only rate your own jokes.');
    }
    await updateDoc(ref, { funnyRate: rating });
  }
  
  export async function updateJokeCategory(jokeId: string, newCategoryName: string, userId: string) {
    const { ref, data } = await getJokeDoc(jokeId);
    if (data.userId !== userId) {
      throw new Error('You can only update your own jokes.');
    }
    const finalCategoryName = await ensureCategoryExists(newCategoryName, userId);
    await updateDoc(ref, { category: finalCategoryName });
  }
  
  export async function getJokeById(jokeId: string): Promise<Joke | null> {
    const { ref } = await getJokeDoc(jokeId); // Re-use getJokeDoc
    const docSnap = await getDoc(ref); // Use the ref from getJokeDoc
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { id: docSnap.id, ...data, dateAdded: (data.dateAdded as Timestamp).toDate() } as Joke;
    }
    return null;
  }
  
  export async function updateJoke(
    jokeId: string,
    updatedData: Partial<Joke>, // This can now include 'used'
    userId: string
  ) {
    const { ref, data } = await getJokeDoc(jokeId);
    if (data.userId !== userId) {
      throw new Error('You can only update your own jokes.');
    }
  
    const dataToUpdate: Record<string, any> = {};
  
    if (updatedData.category) {
      dataToUpdate.category = await ensureCategoryExists(updatedData.category, userId);
    }
    if (updatedData.text !== undefined) dataToUpdate.text = updatedData.text;
    if (updatedData.funnyRate !== undefined) dataToUpdate.funnyRate = updatedData.funnyRate;
    if (updatedData.used !== undefined) dataToUpdate.used = updatedData.used; // Add 'used' to updatable fields
  
    if (Object.keys(dataToUpdate).length === 0) {
      // No changes to save, or only non-updatable fields were passed.
      // Consider if this should be an error or just a silent return.
      return;
    }
  
    await updateDoc(ref, dataToUpdate);
  }

