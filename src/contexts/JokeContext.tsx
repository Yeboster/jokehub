
"use client";

import type { Joke, Category, UserRating } from '@/lib/types'; // Added UserRating
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
  getDoc,
  startAfter,
  deleteField, // Import deleteField
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';

const PAGE_SIZE = 10;

interface UpdateJokeData {
    text?: string;
    category?: string;
    funnyRate?: number;
}

export interface FilterParams { // Exporting for use in page components
  selectedCategories: string[];
  filterFunnyRate: number;
  showOnlyUsed: boolean;
  scope: 'public' | 'user'; // Added scope
}

interface JokeContextProps {
  jokes: Joke[] | null;
  categories: Category[] | null;
  hasMoreJokes: boolean;
  loadingInitialJokes: boolean;
  loadingMoreJokes: boolean;
  addJoke: (newJokeData: { text: string; category: string; funnyRate?: number }) => Promise<void>;
  importJokes: (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => Promise<void>;
  toggleUsed: (id: string, currentUsedStatus: boolean) => Promise<void>;
  rateJoke: (id: string, rating: number) => Promise<void>;
  updateJokeCategory: (jokeId: string, newCategoryName: string) => Promise<void>;
  getJokeById: (jokeId: string) => Promise<Joke | null>;
  updateJoke: (jokeId: string, updatedData: UpdateJokeData) => Promise<void>;
  loadJokesWithFilters: (filters: FilterParams) => Promise<void>;
  loadMoreFilteredJokes: () => Promise<void>;
  submitUserRating: (jokeId: string, ratingValue: number, comment?: string) => Promise<void>;
  getUserRatingForJoke: (jokeId: string) => Promise<UserRating | null>;
}

const JokeContext = createContext<JokeContextProps | undefined>(undefined);

const JOKES_COLLECTION = 'jokes';
const CATEGORIES_COLLECTION = 'categories';
const JOKE_RATINGS_COLLECTION = 'jokeRatings'; // Defined the constant

const defaultFilters: FilterParams = {
  selectedCategories: [],
  filterFunnyRate: -1,
  showOnlyUsed: false,
  scope: 'public', // Default to public scope
};

export const JokeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jokes, setJokes] = useState<Joke[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadingInitialJokes, setLoadingInitialJokes] = useState<boolean>(true);
  const [loadingMoreJokes, setLoadingMoreJokes] = useState<boolean>(false);
  const [hasMoreJokes, setHasMoreJokes] = useState<boolean>(true);
  
  const lastVisibleJokeDocRef = useRef<QueryDocumentSnapshot | null>(null);
  const activeFiltersRef = useRef<FilterParams>(defaultFilters);
  
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const _buildJokesQuery = (filters: FilterParams, paginate: boolean = false) => {
    // For public scope, user can be null. For user scope, user must exist.
    if (filters.scope === 'user' && !user) return null;

    const queryConstraints = [];
    
    if (filters.scope === 'user' && user) {
      queryConstraints.push(where('userId', '==', user.uid));
    }
    // For public scope, no userId filter is applied.

    if (filters.selectedCategories.length > 0) {
      if (filters.selectedCategories.length > 30) {
        toast({ title: 'Filter Warning', description: 'Category filter limited to 30 selections.', variant: 'default' });
        queryConstraints.push(where('category', 'in', filters.selectedCategories.slice(0, 30)));
      } else {
        queryConstraints.push(where('category', 'in', filters.selectedCategories));
      }
    }
    if (filters.filterFunnyRate !== -1) {
      queryConstraints.push(where('funnyRate', '==', filters.filterFunnyRate));
    }
    if (filters.showOnlyUsed) {
      // This filter applies to the 'used' flag set by the joke owner.
      queryConstraints.push(where('used', '==', true));
    }

    queryConstraints.push(orderBy('dateAdded', 'desc'));
    
    if (paginate && lastVisibleJokeDocRef.current) {
      queryConstraints.push(startAfter(lastVisibleJokeDocRef.current));
    }
    queryConstraints.push(limit(PAGE_SIZE));

    return query(collection(db, JOKES_COLLECTION), ...queryConstraints);
  };

  const _fetchJokes = useCallback(async (filters: FilterParams, isLoadMore: boolean) => {
    if (filters.scope === 'user' && !user) {
      setJokes([]);
      setHasMoreJokes(false);
      if (isLoadMore) setLoadingMoreJokes(false); else setLoadingInitialJokes(false);
      return;
    }

    if (isLoadMore) {
      if (!hasMoreJokes || loadingMoreJokes || !lastVisibleJokeDocRef.current) return;
      setLoadingMoreJokes(true);
    } else {
      setLoadingInitialJokes(true);
      setJokes(null); 
      lastVisibleJokeDocRef.current = null;
    }

    const q = _buildJokesQuery(filters, isLoadMore);
    if (!q) { // Should only happen if scope is 'user' but no user.
      setJokes([]);
      setHasMoreJokes(false);
      if (isLoadMore) setLoadingMoreJokes(false); else setLoadingInitialJokes(false);
      return;
    }

    try {
      const snapshot = await getDocs(q);
      const newJokesData = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
        dateAdded: (docSnapshot.data().dateAdded as Timestamp).toDate(),
      } as Joke));

      if (isLoadMore) {
        setJokes(prevJokes => (prevJokes ? [...prevJokes, ...newJokesData] : newJokesData));
      } else {
        setJokes(newJokesData);
      }
      
      lastVisibleJokeDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setHasMoreJokes(snapshot.docs.length === PAGE_SIZE);

    } catch (error: any) {
      console.error('Error fetching jokes:', error);
      if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
         toast({ title: 'Indexing Required', description: 'Some filter combinations may require new database indexes. Check Firestore console.', variant: 'destructive', duration: 10000});
      } else {
        toast({ title: 'Error', description: 'Could not load jokes.', variant: 'destructive' });
      }
      if (!isLoadMore) setJokes([]);
      setHasMoreJokes(false);
    } finally {
      if (isLoadMore) setLoadingMoreJokes(false); else setLoadingInitialJokes(false);
    }
  }, [user, toast]); // Added user and toast dependencies for _fetchJokes


  const loadJokesWithFilters = useCallback(async (filters: FilterParams) => {
    activeFiltersRef.current = filters;
    await _fetchJokes(filters, false);
  }, [_fetchJokes]);

  const loadMoreFilteredJokes = useCallback(async () => {
    await _fetchJokes(activeFiltersRef.current, true);
  }, [_fetchJokes]);

  useEffect(() => {
    if (authLoading) {
      setJokes(null);
      setCategories(null);
      setLoadingInitialJokes(true);
      setHasMoreJokes(true);
      lastVisibleJokeDocRef.current = null;
      activeFiltersRef.current = { ...defaultFilters, scope: 'public' };
      return;
    }

    const categoriesQuery = query(
      collection(db, CATEGORIES_COLLECTION),
      orderBy('name', 'asc')
    );
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const processedCategories: Category[] = snapshot.docs
        .map(docSnapshot => {
          const data = docSnapshot.data();
          if (data && typeof data.name === 'string' && data.name.trim() !== '' && data.userId) {
            return { id: docSnapshot.id, name: data.name.trim(), userId: data.userId };
          }
          return null;
        })
        .filter((cat): cat is Category => cat !== null);
      setCategories(processedCategories);
    }, (error) => {
      console.error('Error fetching categories:', error);
      toast({ title: 'Error', description: 'Could not load categories.', variant: 'destructive' });
      setCategories([]);
    });
    
    let effectiveFilters = { ...activeFiltersRef.current };
    if (effectiveFilters.scope === 'user' && !user) {
        effectiveFilters = { ...defaultFilters, scope: 'public' }; 
    }
    
    if (JSON.stringify(activeFiltersRef.current) !== JSON.stringify(defaultFilters) || 
        (activeFiltersRef.current.scope === 'user' && !user) || 
        (activeFiltersRef.current.scope === 'public' && user && JSON.stringify(activeFiltersRef.current) === JSON.stringify(defaultFilters)) ) {
         loadJokesWithFilters(effectiveFilters);
    } else if (!user) {
        loadJokesWithFilters({ ...defaultFilters, scope: 'public' });
    }

    return () => {
      unsubscribeCategories();
    };
  }, [authLoading, user, toast, loadJokesWithFilters]);


  const _ensureCategoryExistsAndAdd = async (rawCategoryName: string, userId: string): Promise<string> => {
    const categoryName = rawCategoryName.trim();
    if (!categoryName) throw new Error("Category name cannot be empty.");

    const existingCategoryInCache = categories?.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase() && cat.userId === userId);
    if (existingCategoryInCache) return existingCategoryInCache.name;
    
    const q = query(collection(db, CATEGORIES_COLLECTION), where('userId', '==', userId), where('name', '==', categoryName));
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) return querySnapshot.docs[0].data().name as string;
      
      await addDoc(collection(db, CATEGORIES_COLLECTION), { name: categoryName, userId: userId });
      return categoryName;
    } catch (error) {
      console.error(`Error ensuring category "${categoryName}" exists:`, error);
      toast({ title: 'Category Error', description: `Could not verify or add category "${categoryName}".`, variant: 'destructive' });
      throw error;
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
          funnyRate: newJokeData.funnyRate ?? 0,
          dateAdded: Timestamp.now(),
          used: false,
          userId: user.uid,
        });
        toast({ title: 'Success', description: 'Joke added successfully!' });
        if (activeFiltersRef.current.scope === 'user' || activeFiltersRef.current.scope === 'public') {
             await _fetchJokes(activeFiltersRef.current, false);
        }
      } catch (error) {
        console.error('Error adding joke to Firestore:', error);
        if (!(error instanceof Error && error.message.includes("Category"))) {
             toast({ title: 'Error Adding Joke', description: 'Failed to add joke.', variant: 'destructive' });
        }
      }
    },
    [toast, user, categories, _fetchJokes] 
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
        for (const catName of categoriesToEnsure) {
          if (catName) await _ensureCategoryExistsAndAdd(catName, user.uid);
        }

        for (const jokeData of importedJokesData) {
           const finalCategoryName = jokeData.category.trim();
           if (!finalCategoryName) {
                console.warn("Skipping joke with empty category:", jokeData.text);
                continue;
            }
          const docRef = doc(collection(db, JOKES_COLLECTION));
          batch.set(docRef, { ...jokeData, category: finalCategoryName, funnyRate: jokeData.funnyRate ?? 0, dateAdded: Timestamp.now(), used: false, userId: user.uid });
          successfulImports++;
        }
        await batch.commit();
        toast({ title: 'Import Complete', description: `Processed ${successfulImports} jokes.` });
        if (activeFiltersRef.current.scope === 'user' || activeFiltersRef.current.scope === 'public') {
            await _fetchJokes(activeFiltersRef.current, false);
        }
      } catch (error) {
        console.error('Error importing jokes:', error);
         if (!(error instanceof Error && error.message.includes("Category"))) {
            toast({ title: 'Import Error', description: 'Failed to import some or all jokes.', variant: 'destructive' });
        }
      }
    },
    [toast, user, categories, _fetchJokes]
  );

  const toggleUsed = useCallback(
    async (id: string, currentUsedStatus: boolean) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, id);
      try {
         const docSnap = await getDoc(jokeDocRef);
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) {
            toast({ title: 'Permission Denied', description: 'You can only update your own jokes.', variant: 'destructive'});
            return;
         }
        
        await updateDoc(jokeDocRef, { used: !currentUsedStatus });
        setJokes(prevJokes => prevJokes?.map(j => j.id === id ? {...j, used: !currentUsedStatus} : j) ?? null);
        if (activeFiltersRef.current.showOnlyUsed && activeFiltersRef.current.scope === 'user') {
            await _fetchJokes(activeFiltersRef.current, false);
        } else if (activeFiltersRef.current.showOnlyUsed && activeFiltersRef.current.scope === 'public') {
            await _fetchJokes(activeFiltersRef.current, false);
        }
      } catch (error: any) {
        console.error('Error toggling joke status:', error);
        toast({ title: 'Error', description: error.message || 'Failed to update joke status.', variant: 'destructive' });
      }
    },
    [toast, user, _fetchJokes]
  );

  const rateJoke = useCallback(
    async (id: string, rating: number) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to rate jokes.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, id);
      try {
         const docSnap = await getDoc(jokeDocRef);
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) {
             toast({ title: 'Permission Denied', description: 'You can only rate your own jokes.', variant: 'destructive'});
             return;
         }
        
        await updateDoc(jokeDocRef, { funnyRate: rating });
        setJokes(prevJokes => prevJokes?.map(j => j.id === id ? {...j, funnyRate: rating} : j) ?? null);
        
        const currentFilters = activeFiltersRef.current;
        if (currentFilters.filterFunnyRate !== -1 && 
            ( (docSnap.data()?.funnyRate !== currentFilters.filterFunnyRate && rating === currentFilters.filterFunnyRate) ||
              (docSnap.data()?.funnyRate === currentFilters.filterFunnyRate && rating !== currentFilters.filterFunnyRate) )) { 
             await _fetchJokes(currentFilters, false);
        }

      } catch (error: any) {
        console.error('Error rating joke:', error);
        toast({ title: 'Error', description: error.message || 'Failed to rate joke.', variant: 'destructive' });
      }
    },
    [toast, user, _fetchJokes]
  );

  const updateJokeCategory = useCallback(
    async (jokeId: string, newRawCategoryName: string) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, jokeId);
      try {
         const docSnap = await getDoc(jokeDocRef);
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) {
            toast({ title: 'Permission Denied', description: 'You can only update your own jokes.', variant: 'destructive'});
            return;
         }

        const finalCategoryName = await _ensureCategoryExistsAndAdd(newRawCategoryName, user.uid);
        await updateDoc(jokeDocRef, { category: finalCategoryName });
        toast({ title: 'Category Updated', description: 'Joke category changed successfully.'});
        
        const currentJoke = jokes?.find(j => j.id === jokeId);
        const categoryChanged = currentJoke?.category !== finalCategoryName;
        const affectsFilter = activeFiltersRef.current.selectedCategories.length > 0 && 
                             (activeFiltersRef.current.selectedCategories.includes(currentJoke?.category || '') ||
                              activeFiltersRef.current.selectedCategories.includes(finalCategoryName));

        if (categoryChanged && (affectsFilter || activeFiltersRef.current.scope === 'user')) {
            await _fetchJokes(activeFiltersRef.current, false);
        } else if (categoryChanged) {
             setJokes(prevJokes => prevJokes?.map(j => j.id === jokeId ? {...j, category: finalCategoryName} : j) ?? null);
        }
      } catch (error: any) {
        console.error('Error updating joke category:', error);
        if (!(error instanceof Error && error.message.includes("Category"))) {
            toast({ title: 'Error Updating Category', description: error.message || 'Failed to update joke category.', variant: 'destructive' });
        }
        throw error;
      }
    },
    [toast, user, categories, jokes, _fetchJokes]
  );

  const getJokeById = useCallback(async (jokeId: string): Promise<Joke | null> => {
     const jokeDocRef = doc(db, JOKES_COLLECTION, jokeId);
     try {
        const docSnap = await getDoc(jokeDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return { id: docSnap.id, ...data, dateAdded: (data.dateAdded as Timestamp).toDate() } as Joke;
        }
        return null;
     } catch (error) {
        console.error(`Error fetching joke ${jokeId}:`, error);
        toast({ title: 'Error', description: 'Could not fetch joke details.', variant: 'destructive'});
        return null;
     }
  }, [toast]);

   const updateJoke = useCallback(async (jokeId: string, updatedData: UpdateJokeData) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to update a joke.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, jokeId);
      const dataToUpdate: Record<string, any> = {};
      try {
         const docSnap = await getDoc(jokeDocRef);
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) {
            toast({ title: 'Permission Denied', description: 'You can only update your own jokes.', variant: 'destructive'});
            throw new Error("Joke not found or permission denied.");
         }

         if (updatedData.category) {
            dataToUpdate.category = await _ensureCategoryExistsAndAdd(updatedData.category, user.uid);
         }
         if (updatedData.text !== undefined) dataToUpdate.text = updatedData.text;
         if (updatedData.funnyRate !== undefined) dataToUpdate.funnyRate = updatedData.funnyRate;

         if (Object.keys(dataToUpdate).length === 0) {
             toast({ title: 'No Changes', description: 'No changes were detected.', variant: 'default' });
             return;
         }
         await updateDoc(jokeDocRef, dataToUpdate);
         toast({ title: 'Success', description: 'Joke updated successfully!' });
         await _fetchJokes(activeFiltersRef.current, false);
      } catch (error: any) {
          console.error(`Error updating joke ${jokeId}:`, error);
           if (!(error instanceof Error && error.message.includes("Category")) && !(error instanceof Error && error.message.includes("permission denied"))) {
             toast({ title: 'Error Updating Joke', description: error.message || 'Failed to update joke.', variant: 'destructive' });
           }
           throw error; 
      }
   }, [user, toast, categories, _fetchJokes]);

  const submitUserRating = useCallback(async (jokeId: string, ratingValue: number, comment?: string): Promise<void> => {
    if (!user) {
      toast({ title: 'Login Required', description: 'You must be logged in to rate a joke.', variant: 'destructive' });
      return;
    }
    if (ratingValue < 1 || ratingValue > 5) {
        toast({ title: 'Invalid Rating', description: 'Rating must be between 1 and 5 stars.', variant: 'destructive'});
        return;
    }

    const ratingsCollectionRef = collection(db, JOKE_RATINGS_COLLECTION);
    const q = query(ratingsCollectionRef, where('jokeId', '==', jokeId), where('userId', '==', user.uid));

    try {
      const querySnapshot = await getDocs(q);
      const now = Timestamp.now();
      const ratingData: any = {
        jokeId,
        userId: user.uid,
        ratingValue,
        updatedAt: now,
      };

      if (comment && comment.trim() !== '') {
        ratingData.comment = comment.trim();
      } else {
        // If comment is empty or undefined, ensure it's removed if it exists
        ratingData.comment = deleteField();
      }

      if (!querySnapshot.empty) {
        // Update existing rating
        const existingRatingDocRef = querySnapshot.docs[0].ref;
        // Make sure 'createdAt' is not part of the update data unless you want to overwrite it (which is usually not the case)
        const updateData = {...ratingData};
        delete updateData.createdAt; // createdAt should not be updated

        await updateDoc(existingRatingDocRef, updateData);
        toast({ title: 'Rating Updated', description: 'Your rating has been successfully updated.' });
      } else {
        // Create new rating
        ratingData.createdAt = now; // Set createdAt only for new ratings
        await addDoc(ratingsCollectionRef, ratingData);
        toast({ title: 'Rating Submitted', description: 'Your rating has been successfully submitted.' });
      }
    } catch (error: any) {
      console.error("Error submitting user rating:", error);
      toast({ title: 'Rating Error', description: error.message || 'Failed to submit your rating.', variant: 'destructive' });
      throw error; // Re-throw to be handled by the caller if needed
    }
  }, [user, toast]);


  const getUserRatingForJoke = useCallback(async (jokeId: string): Promise<UserRating | null> => {
    // No specific auth check here as it might be called even for non-logged-in users to prepare UI,
    // but submitUserRating will prevent action. Or, simply return null if no user.
    if (!user) {
      return null;
    }
    const ratingsCollectionRef = collection(db, JOKE_RATINGS_COLLECTION);
    const q = query(ratingsCollectionRef, where('jokeId', '==', jokeId), where('userId', '==', user.uid), limit(1));

    try {
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
    } catch (error: any) {
      console.error("Error fetching user rating:", error);
      toast({ title: 'Rating Fetch Error', description: 'Could not fetch your existing rating.', variant: 'destructive' });
      return null;
    }
  }, [user, toast]);


  const value = {
    jokes,
    categories,
    addJoke,
    importJokes,
    toggleUsed,
    rateJoke,
    updateJokeCategory,
    getJokeById,
    updateJoke,
    loadJokesWithFilters,
    loadMoreFilteredJokes,
    hasMoreJokes,
    loadingInitialJokes,
    loadingMoreJokes,
    submitUserRating, 
    getUserRatingForJoke,
  } as JokeContextProps; 

  return <JokeContext.Provider value={value}>{children}</JokeContext.Provider>;
};

export const useJokes = (): JokeContextProps => {
  const context = useContext(JokeContext);
  if (context === undefined) {
    throw new Error('useJokes must be used within a JokeProvider');
  }
  return context;
};

