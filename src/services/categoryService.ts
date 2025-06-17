
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Category } from '@/lib/types';

const CATEGORIES_COLLECTION = 'categories';

/**
 * Ensures a category exists for a user, creating it if it doesn't.
 * @param categoryName - The name of the category.
 * @param userId - The ID of the user.
 * @returns The final category name.
 */
export async function ensureCategoryExists(categoryName: string, userId: string): Promise<string> {
  const trimmedCategoryName = categoryName.trim();
  if (!trimmedCategoryName) {
    throw new Error('Category name cannot be empty.');
  }

  const q = query(
    collection(db, CATEGORIES_COLLECTION),
    where('userId', '==', userId),
    where('name', '==', trimmedCategoryName)
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data().name as string;
  }

  await addDoc(collection(db, CATEGORIES_COLLECTION), {
    name: trimmedCategoryName,
    userId: userId,
  });
  return trimmedCategoryName;
}

/**
 * Subscribes to category updates for a specific user.
 * @param userId - The ID of the user.
 * @param onUpdate - Callback function to handle category updates.
 * @param onError - Callback function for errors.
 * @returns An unsubscribe function.
 */
export function subscribeToUserCategories(
  userId: string,
  onUpdate: (categories: Category[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, CATEGORIES_COLLECTION),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        if (data && typeof data.name === 'string' && data.name.trim() !== '') {
          return { id: doc.id, name: data.name.trim(), userId: data.userId };
        }
        return null;
      })
      .filter((cat): cat is Category => cat !== null);
    onUpdate(categories);
  }, (error) => {
    console.error('Error fetching user categories:', error);
    onError(new Error('Could not load user categories.'));
  });

  return unsubscribe;
}

/**
 * Subscribes to all category documents in the collection.
 * @param onUpdate - Callback function to handle category updates.
 * @param onError - Callback function for errors.
 * @returns An unsubscribe function.
 */
export function subscribeToAllCategoriesFromCollection(
  onUpdate: (categories: Category[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, CATEGORIES_COLLECTION),
    orderBy('name', 'asc') 
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        // Basic validation, ensure name exists and is a non-empty string
        if (data && typeof data.name === 'string' && data.name.trim() !== '' && typeof data.userId === 'string') {
          return { id: doc.id, name: data.name.trim(), userId: data.userId };
        }
        return null; // Skip malformed documents
      })
      .filter((cat): cat is Category => cat !== null); // Type guard to filter out nulls
    onUpdate(categories);
  }, (error) => {
    console.error('Error fetching all categories:', error);
    onError(new Error('Could not load all categories.'));
  });

  return unsubscribe;
}
