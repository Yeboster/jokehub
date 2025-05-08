"use client";

import type { Joke, Category } from '@/lib/types';
import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  where, 
  limit,
  getDocs,
  // deleteDoc, // Available if needed
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext'; // Import useAuth

interface JokeContextProps {
  jokes: Joke[] | null; // null indicates loading state
  categories: Category[] | null; // null indicates loading state
  addJoke: (newJokeData: { text: string; category: string; funnyRate?: number }) => Promise<void>;
  importJokes: (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => Promise<void>;
  toggleUsed: (id: string, currentUsedStatus: boolean) => Promise<void>;
  rateJoke: (id: string, rating: number) => Promise<void>;
  updateJokeCategory: (jokeId: string, newCategoryName: string) => Promise<void>;
}

const JokeContext = createContext<JokeContextProps | undefined>(undefined);

const JOKES_COLLECTION = 'jokes';
const CATEGORIES_COLLECTION = 'categories';

export const JokeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jokes, setJokes] = useState<Joke[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) {
      setJokes(null);
      setCategories(null);
      return;
    }

    if (!user) {
      setJokes([]);
      setCategories([]);
      return;
    }

    // Subscribe to Jokes
    const jokesQuery = query(
      collection(db, JOKES_COLLECTION),
      where('userId', '==', user.uid),
      orderBy('dateAdded', 'desc')
    );
    const unsubscribeJokes = onSnapshot(jokesQuery, (snapshot) => {
      const jokesData: Joke[] = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
        dateAdded: (docSnapshot.data().dateAdded as Timestamp).toDate(),
      } as Joke));
      setJokes(jokesData);
    }, (error) => {
      console.error('Error fetching jokes:', error);
      toast({ title: 'Error', description: 'Could not load jokes.', variant: 'destructive' });
      setJokes([]);
    });

    // Subscribe to Categories
    const categoriesQuery = query(
      collection(db, CATEGORIES_COLLECTION),
      where('userId', '==', user.uid),
      orderBy('name', 'asc') // Firestore sorts by name
    );
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const processedCategories: Category[] = [];
      snapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        // Validate structure and ensure name is a non-empty string
        if (data && typeof data.name === 'string' && data.name.trim() !== '' && typeof data.userId === 'string') {
          processedCategories.push({
            id: docSnapshot.id,
            name: data.name.trim(), // Use trimmed name
            userId: data.userId,
          });
        } else {
          // Log a warning for malformed category documents
          console.warn(`Malformed category document found with id ${docSnapshot.id}, data:`, data);
        }
      });
      // `orderBy` in query should handle sorting, but client-side sort can be added if needed for specific locale
      // For example: processedCategories.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(processedCategories);
    }, (error) => {
      console.error('Error fetching categories:', error);
      toast({ title: 'Error', description: 'Could not load categories.', variant: 'destructive' });
      setCategories([]); // Fallback to empty array on error
    });

    return () => {
      unsubscribeJokes();
      unsubscribeCategories();
    };
  }, [user, authLoading, toast]);

  const _ensureCategoryExistsAndAdd = async (rawCategoryName: string, userId: string): Promise<string> => {
    const categoryName = rawCategoryName.trim();
    if (!categoryName) {
        throw new Error("Category name cannot be empty.");
    }

    const q = query(
      collection(db, CATEGORIES_COLLECTION),
      where('name', '==', categoryName),
      where('userId', '==', userId),
      limit(1)
    );

    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        await addDoc(collection(db, CATEGORIES_COLLECTION), {
          name: categoryName,
          userId: userId,
          // createdAt: Timestamp.now(), // Optional: if you want to track creation date
        });
        // The onSnapshot listener for categories will update the local state.
      }
      return categoryName; // Return the processed category name
    } catch (error) {
      console.error(`Error ensuring category "${categoryName}" exists:`, error);
      toast({
        title: 'Category Management Error',
        description: `Could not verify or add category "${categoryName}".`,
        variant: 'destructive',
      });
      throw error; // Re-throw to be handled by the caller (addJoke/importJokes)
    }
  };

  const addJoke = useCallback(
    async (newJokeData: { text: string; category: string; funnyRate?: number }) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to add a joke.', variant: 'destructive' });
        return;
      }
      try {
        const finalCategoryName = await _ensureCategoryExistsAndAdd(newJokeData.category, user.uid);
        
        await addDoc(collection(db, JOKES_COLLECTION), {
          text: newJokeData.text,
          category: finalCategoryName,
          funnyRate: newJokeData.funnyRate !== undefined ? newJokeData.funnyRate : 0,
          dateAdded: Timestamp.now(),
          used: false,
          userId: user.uid,
        });
        toast({
          title: 'Success',
          description: 'Joke added successfully!',
        });
      } catch (error) {
        console.error('Error adding joke to Firestore:', error);
        // Error specific to joke adding, distinct from category error which is handled in _ensureCategory...
        if (!(error instanceof Error && error.message.includes("Category"))) {
             toast({
                title: 'Error Adding Joke',
                description: 'Failed to add joke. The category might have had an issue.',
                variant: 'destructive',
            });
        }
      }
    },
    [toast, user]
  );

  const importJokes = useCallback(
    async (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to import jokes.', variant: 'destructive' });
        return;
      }
      const batch = writeBatch(db);
      let successfulImports = 0;
      try {
        for (const jokeData of importedJokesData) {
          // Ensure category exists for each joke, or create it
          const finalCategoryName = await _ensureCategoryExistsAndAdd(jokeData.category, user.uid);
          const docRef = doc(collection(db, JOKES_COLLECTION));
          batch.set(docRef, {
            ...jokeData,
            category: finalCategoryName, // Use the processed category name
            funnyRate: jokeData.funnyRate !== undefined ? jokeData.funnyRate : 0,
            dateAdded: Timestamp.now(),
            used: false,
            userId: user.uid,
          });
          successfulImports++;
        }
        await batch.commit();
        toast({
          title: 'Import Successful',
          description: `Imported ${successfulImports} jokes.`,
        });
      } catch (error) {
        console.error('Error importing jokes to Firestore:', error);
         // Error specific to joke importing, distinct from category error which is handled in _ensureCategory...
         if (!(error instanceof Error && error.message.includes("Category"))) {
            toast({
                title: 'Import Error',
                description: 'Failed to import some or all jokes. Some categories might have had an issue.',
                variant: 'destructive',
            });
        }
      }
    },
    [toast, user]
  );

  const toggleUsed = useCallback(
    async (id: string, currentUsedStatus: boolean) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, id);
      try {
        await updateDoc(jokeDocRef, { used: !currentUsedStatus });
      } catch (error) {
        console.error('Error toggling joke status:', error);
        toast({ title: 'Error', description: 'Failed to update joke status.', variant: 'destructive' });
      }
    },
    [toast, user]
  );

  const rateJoke = useCallback(
    async (id: string, rating: number) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, id);
      try {
        await updateDoc(jokeDocRef, { funnyRate: rating });
      } catch (error) {
        console.error('Error rating joke:', error);
        toast({ title: 'Error', description: 'Failed to rate joke.', variant: 'destructive' });
      }
    },
    [toast, user]
  );

  const updateJokeCategory = useCallback(
    async (jokeId: string, newRawCategoryName: string) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to update joke category.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, jokeId);
      try {
        const finalCategoryName = await _ensureCategoryExistsAndAdd(newRawCategoryName, user.uid);
        await updateDoc(jokeDocRef, { category: finalCategoryName });
        toast({
          title: 'Category Updated',
          description: 'Joke category changed successfully.',
        });
      } catch (error) {
        console.error('Error updating joke category:', error);
        // Specific toast for category update failure, unless it was a category management issue handled in _ensureCategoryExistsAndAdd
        if (!(error instanceof Error && error.message.includes("Category"))) {
            toast({
              title: 'Error Updating Category',
              description: 'Failed to update joke category. The new category might have had an issue.',
              variant: 'destructive',
            });
        }
      }
    },
    [toast, user]
  );

  const value = {
    jokes,
    categories,
    addJoke,
    importJokes,
    toggleUsed,
    rateJoke,
    updateJokeCategory,
  };

  return <JokeContext.Provider value={value}>{children}</JokeContext.Provider>;
};

export const useJokes = (): JokeContextProps => {
  const context = useContext(JokeContext);
  if (context === undefined) {
    throw new Error('useJokes must be used within a JokeProvider');
  }
  return context;
};

