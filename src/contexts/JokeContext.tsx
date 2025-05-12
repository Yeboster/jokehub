
"use client";

import type { Joke, Category } from '@/lib/types';
import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  getDoc, // Import getDoc for fetching single document
  startAfter,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  // deleteDoc, // Available if needed
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext'; // Import useAuth

const PAGE_SIZE = 10; // Number of jokes to fetch per page

// Define the shape of the data needed for updating a joke
interface UpdateJokeData {
    text?: string;
    category?: string;
    funnyRate?: number;
    // used status is handled by toggleUsed
}


interface JokeContextProps {
  jokes: Joke[] | null; // null indicates loading state
  categories: Category[] | null; // null indicates loading state
  hasMoreJokes: boolean;
  loadingInitialJokes: boolean;
  loadingMoreJokes: boolean;
  addJoke: (newJokeData: { text: string; category: string; funnyRate?: number }) => Promise<void>;
  importJokes: (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => Promise<void>;
  toggleUsed: (id: string, currentUsedStatus: boolean) => Promise<void>;
  rateJoke: (id: string, rating: number) => Promise<void>;
  updateJokeCategory: (jokeId: string, newCategoryName: string) => Promise<void>; // Keep for now, might refactor later
  getJokeById: (jokeId: string) => Promise<Joke | null>; // New function to fetch a single joke
  updateJoke: (jokeId: string, updatedData: UpdateJokeData) => Promise<void>; // New function to update joke details
  loadMoreJokes: () => Promise<void>;
}

const JokeContext = createContext<JokeContextProps | undefined>(undefined);

const JOKES_COLLECTION = 'jokes';
const CATEGORIES_COLLECTION = 'categories';

export const JokeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jokes, setJokes] = useState<Joke[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadingInitialJokes, setLoadingInitialJokes] = useState<boolean>(true);
  const [loadingMoreJokes, setLoadingMoreJokes] = useState<boolean>(false);
  const [hasMoreJokes, setHasMoreJokes] = useState<boolean>(true);
  const lastVisibleJokeDocRef = useRef<QueryDocumentSnapshot | null>(null); // Ref to store the last doc snapshot for pagination
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Function to reset pagination state
  const resetPagination = () => {
    setJokes(null); // Trigger initial loading state
    lastVisibleJokeDocRef.current = null;
    setHasMoreJokes(true);
    setLoadingInitialJokes(true);
    setLoadingMoreJokes(false);
  };

  // Effect for handling initial data fetching and user changes
  useEffect(() => {
    if (authLoading) {
      resetPagination();
      setCategories(null);
      return;
    }

    if (!user) {
      setJokes([]); // Set to empty array for logged-out state
      setCategories([]);
      setLoadingInitialJokes(false);
      setHasMoreJokes(false);
      return;
    }

    // Reset pagination state when user changes or logs in
    resetPagination();

    // --- Initial Jokes Fetch ---
    const initialJokesQuery = query(
      collection(db, JOKES_COLLECTION),
      where('userId', '==', user.uid),
      orderBy('dateAdded', 'desc'),
      limit(PAGE_SIZE)
    );

    const unsubscribeJokes = onSnapshot(initialJokesQuery, (snapshot) => {
      const jokesData: Joke[] = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
        dateAdded: (docSnapshot.data().dateAdded as Timestamp).toDate(),
      } as Joke));

      setJokes(jokesData);
      lastVisibleJokeDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setHasMoreJokes(snapshot.docs.length === PAGE_SIZE);
      setLoadingInitialJokes(false);
    }, (error) => {
      console.error('Error fetching initial jokes:', error);
      toast({ title: 'Error', description: 'Could not load initial jokes.', variant: 'destructive' });
      setJokes([]); // Fallback to empty array on error
      setLoadingInitialJokes(false);
      setHasMoreJokes(false);
    });

    // --- Categories Fetch ---
    const categoriesQuery = query(
      collection(db, CATEGORIES_COLLECTION),
      where('userId', '==', user.uid),
      orderBy('name', 'asc')
    );
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const processedCategories: Category[] = snapshot.docs
        .map(docSnapshot => {
          const data = docSnapshot.data();
          // Ensure name is a non-empty string and userId matches
          if (data && typeof data.name === 'string' && data.name.trim() !== '' && data.userId === user.uid) {
            return {
              id: docSnapshot.id,
              name: data.name.trim(),
              userId: data.userId,
            };
          }
          // Silently ignore categories that don't match the user or are malformed
          if (data && data.userId !== user.uid) {
             // This shouldn't happen due to the query 'where' clause, but good to have a check
             console.warn(`Category document ${docSnapshot.id} fetched but userId does not match current user.`);
          } else if (data && (typeof data.name !== 'string' || data.name.trim() === '')) {
             console.warn(`Malformed category document found with id ${docSnapshot.id}, invalid name:`, data.name);
          }
          return null;
        })
        .filter((cat): cat is Category => cat !== null); // Type guard to remove nulls

      setCategories(processedCategories);
    }, (error) => {
      console.error('Error fetching categories:', error);
      toast({ title: 'Error', description: 'Could not load categories.', variant: 'destructive' });
      setCategories([]); // Fallback to empty array on error
    });

    // Cleanup function
    return () => {
      unsubscribeJokes();
      unsubscribeCategories();
      resetPagination(); // Reset state on cleanup/unmount
    };
  }, [user, authLoading, toast]); // Dependencies


  // --- Category Management ---
  const _ensureCategoryExistsAndAdd = async (rawCategoryName: string, userId: string): Promise<string> => {
    const categoryName = rawCategoryName.trim();
    if (!categoryName) {
        throw new Error("Category name cannot be empty.");
    }

    // Check local state first for potential performance improvement
    const existingCategory = categories?.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase() && cat.userId === userId);
    if (existingCategory) {
        return existingCategory.name; // Return the existing name (with original casing)
    }


    // If not found locally, query Firestore (handles cases where local state might be stale or category was just added)
    const q = query(
      collection(db, CATEGORIES_COLLECTION),
      where('userId', '==', userId),
      where('name', '==', categoryName) // Case-sensitive query; Firestore default
      // Consider storing a lowercase version for case-insensitive checks if needed,
      // but for now, we rely on finding the exact match or creating a new one.
    );

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        // Category exists, return its name (maintaining original casing from DB)
        return querySnapshot.docs[0].data().name;
      } else {
         // Category doesn't exist, add it
        await addDoc(collection(db, CATEGORIES_COLLECTION), {
          name: categoryName,
          userId: userId,
        });
        // The onSnapshot listener for categories should pick this up and update the local state.
        return categoryName; // Return the newly added category name
      }
    } catch (error) {
      console.error(`Error ensuring category "${categoryName}" exists:`, error);
      toast({
        title: 'Category Error',
        description: `Could not verify or add category "${categoryName}".`,
        variant: 'destructive',
      });
      throw error; // Propagate error
    }
  };


  // --- Joke Operations ---

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
          funnyRate: newJokeData.funnyRate ?? 0,
          dateAdded: Timestamp.now(),
          used: false,
          userId: user.uid,
        });
        toast({ title: 'Success', description: 'Joke added successfully!' });
        // Note: Real-time listener will update the list, potentially showing the new joke at the top.
        // Manual state update isn't strictly necessary but could provide faster UI feedback if desired.
        // Consider if resetPagination() is needed here depending on desired UX.
      } catch (error) {
        console.error('Error adding joke to Firestore:', error);
        if (!(error instanceof Error && error.message.includes("Category"))) {
             toast({
                title: 'Error Adding Joke',
                description: 'Failed to add joke.',
                variant: 'destructive',
            });
        }
      }
    },
    [toast, user, categories] // Added categories dependency for local check in _ensureCategoryExistsAndAdd
  );

  const importJokes = useCallback(
    async (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to import jokes.', variant: 'destructive' });
        return;
      }
      const batch = writeBatch(db);
      let successfulImports = 0;
      const categoriesToEnsure = new Set<string>();
      importedJokesData.forEach(joke => categoriesToEnsure.add(joke.category.trim()));

      try {
        // Ensure all unique categories exist first
        for (const catName of categoriesToEnsure) {
          if (catName) { // Check if category name is not empty after trim
             await _ensureCategoryExistsAndAdd(catName, user.uid);
          }
        }

        // Now add jokes using the ensured (and trimmed) category names
        for (const jokeData of importedJokesData) {
           const finalCategoryName = jokeData.category.trim();
           if (!finalCategoryName) {
                console.warn("Skipping joke with empty category:", jokeData.text);
                continue; // Skip jokes with empty categories
            }

          const docRef = doc(collection(db, JOKES_COLLECTION));
          batch.set(docRef, {
            ...jokeData,
            category: finalCategoryName, // Use processed name
            funnyRate: jokeData.funnyRate ?? 0,
            dateAdded: Timestamp.now(),
            used: false,
            userId: user.uid,
          });
          successfulImports++;
        }

        await batch.commit();
        toast({
          title: 'Import Complete',
          description: `Processed ${successfulImports} jokes.`,
        });
         // Consider resetting pagination if the import significantly changes the first page.
         resetPagination();

      } catch (error) {
        console.error('Error importing jokes:', error);
         if (!(error instanceof Error && error.message.includes("Category"))) {
            toast({
                title: 'Import Error',
                description: 'Failed to import some or all jokes.',
                variant: 'destructive',
            });
        }
      }
    },
    [toast, user, categories] // Added categories dependency
  );

  const toggleUsed = useCallback(
    async (id: string, currentUsedStatus: boolean) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, id);
      try {
         // Check ownership before updating (optional but good practice)
         const docSnap = await getDoc(jokeDocRef);
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) {
             throw new Error("Joke not found or permission denied.");
         }
        await updateDoc(jokeDocRef, { used: !currentUsedStatus });
        // Real-time listener updates the state in the list view
      } catch (error: any) {
        console.error('Error toggling joke status:', error);
        toast({ title: 'Error', description: error.message || 'Failed to update joke status.', variant: 'destructive' });
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
         // Check ownership before updating
         const docSnap = await getDoc(jokeDocRef);
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) {
             throw new Error("Joke not found or permission denied.");
         }
        await updateDoc(jokeDocRef, { funnyRate: rating });
        // Real-time listener updates the state
      } catch (error: any) {
        console.error('Error rating joke:', error);
        toast({ title: 'Error', description: error.message || 'Failed to rate joke.', variant: 'destructive' });
      }
    },
    [toast, user]
  );

  // Kept for potential direct category updates, but `updateJoke` is more general
  const updateJokeCategory = useCallback(
    async (jokeId: string, newRawCategoryName: string) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, jokeId);
      try {
        // Check ownership before updating
         const docSnap = await getDoc(jokeDocRef);
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) {
             throw new Error("Joke not found or permission denied.");
         }

        const finalCategoryName = await _ensureCategoryExistsAndAdd(newRawCategoryName, user.uid);
        await updateDoc(jokeDocRef, { category: finalCategoryName });
        // Real-time listener updates the state
        toast({
          title: 'Category Updated',
          description: 'Joke category changed successfully.',
        });
      } catch (error: any) {
        console.error('Error updating joke category:', error);
        if (!(error instanceof Error && error.message.includes("Category"))) {
            toast({
              title: 'Error Updating Category',
              description: error.message || 'Failed to update joke category.',
              variant: 'destructive',
            });
        }
        throw error; // Re-throw for the caller if needed
      }
    },
    [toast, user, categories] // Added categories dependency
  );


  // New function to fetch a single joke by ID
  const getJokeById = useCallback(async (jokeId: string): Promise<Joke | null> => {
     if (!user) {
        // console.log("getJokeById: No user logged in.");
        return null;
     }
     const jokeDocRef = doc(db, JOKES_COLLECTION, jokeId);
     try {
        const docSnap = await getDoc(jokeDocRef);
        if (docSnap.exists() && docSnap.data()?.userId === user.uid) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                text: data.text,
                category: data.category,
                funnyRate: data.funnyRate,
                dateAdded: (data.dateAdded as Timestamp).toDate(),
                used: data.used,
                userId: data.userId,
            } as Joke;
        } else {
            // console.log(`getJokeById: Joke ${jokeId} not found or user mismatch.`);
            return null; // Not found or not owned by user
        }
     } catch (error) {
        console.error(`Error fetching joke ${jokeId}:`, error);
        toast({ title: 'Error', description: 'Could not fetch joke details.', variant: 'destructive'});
        return null;
     }
  }, [user, toast]); // Added user and toast dependencies


   // New function to update joke details (text, category, funnyRate)
   const updateJoke = useCallback(async (jokeId: string, updatedData: UpdateJokeData) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to update a joke.', variant: 'destructive' });
        return;
      }

      const jokeDocRef = doc(db, JOKES_COLLECTION, jokeId);
      const dataToUpdate: Record<string, any> = {};
      let finalCategoryName = updatedData.category; // Use provided category initially

      try {
          // Check ownership before updating
         const docSnap = await getDoc(jokeDocRef);
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) {
             throw new Error("Joke not found or permission denied.");
         }

         // Prepare update data, ensuring category exists if provided
         if (updatedData.category) {
            finalCategoryName = await _ensureCategoryExistsAndAdd(updatedData.category, user.uid);
            dataToUpdate.category = finalCategoryName;
         }
         if (updatedData.text !== undefined) { // Check for undefined to allow empty string
             dataToUpdate.text = updatedData.text;
         }
         if (updatedData.funnyRate !== undefined) {
             dataToUpdate.funnyRate = updatedData.funnyRate;
         }

         if (Object.keys(dataToUpdate).length === 0) {
             toast({ title: 'No Changes', description: 'No changes were detected.', variant: 'default' });
             return; // Nothing to update
         }

         await updateDoc(jokeDocRef, dataToUpdate);
         toast({ title: 'Success', description: 'Joke updated successfully!' });
          // The real-time listener on the main page will reflect changes.
          // If the updated joke's sort order changes (e.g., dateAdded), pagination might need reset,
          // but typically updates don't change the order based on 'dateAdded desc'.

      } catch (error: any) {
          console.error(`Error updating joke ${jokeId}:`, error);
           if (!(error instanceof Error && error.message.includes("Category"))) {
             toast({ title: 'Error Updating Joke', description: error.message || 'Failed to update joke.', variant: 'destructive' });
           }
           throw error; // Re-throw error for the form to handle
      }

   }, [user, toast, categories]); // Added user, toast, categories


  const loadMoreJokes = useCallback(async () => {
    if (!user || !hasMoreJokes || loadingMoreJokes || !lastVisibleJokeDocRef.current) {
      return; // Exit if no user, no more jokes, already loading, or no last doc
    }

    setLoadingMoreJokes(true);

    const moreJokesQuery = query(
      collection(db, JOKES_COLLECTION),
      where('userId', '==', user.uid),
      orderBy('dateAdded', 'desc'),
      startAfter(lastVisibleJokeDocRef.current), // Start after the last fetched doc
      limit(PAGE_SIZE)
    );

    try {
      const snapshot = await getDocs(moreJokesQuery);
      const newJokes = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
        dateAdded: (docSnapshot.data().dateAdded as Timestamp).toDate(),
      } as Joke));

      // Append new jokes to the existing list
      setJokes(prevJokes => (prevJokes ? [...prevJokes, ...newJokes] : newJokes));

      lastVisibleJokeDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setHasMoreJokes(snapshot.docs.length === PAGE_SIZE);

    } catch (error) {
      console.error('Error loading more jokes:', error);
      toast({ title: 'Error', description: 'Could not load more jokes.', variant: 'destructive' });
      setHasMoreJokes(false); // Assume no more if error occurs
    } finally {
      setLoadingMoreJokes(false);
    }
  }, [user, hasMoreJokes, loadingMoreJokes, toast]); // Added dependencies


  // Context Value
  const value = {
    jokes,
    categories,
    addJoke,
    importJokes,
    toggleUsed,
    rateJoke,
    updateJokeCategory,
    getJokeById, // Expose new function
    updateJoke, // Expose new function
    loadMoreJokes,
    hasMoreJokes,
    loadingInitialJokes,
    loadingMoreJokes,
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
