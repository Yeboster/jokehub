
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
  getDoc,
  startAfter,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type WhereFilterOp,
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

interface FilterParams {
  selectedCategories: string[];
  filterFunnyRate: number;
  showOnlyUsed: boolean;
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
}

const JokeContext = createContext<JokeContextProps | undefined>(undefined);

const JOKES_COLLECTION = 'jokes';
const CATEGORIES_COLLECTION = 'categories';

const defaultFilters: FilterParams = {
  selectedCategories: [],
  filterFunnyRate: -1,
  showOnlyUsed: false,
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
    if (!user) return null;

    const queryConstraints = [];
    queryConstraints.push(where('userId', '==', user.uid));

    if (filters.selectedCategories.length > 0) {
      // Firestore 'in' query limited to 30 values. If more, consider alternative strategies or multiple queries.
      // For this implementation, we'll assume selectedCategories.length <= 30.
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
      queryConstraints.push(where('used', '==', true));
    }

    queryConstraints.push(orderBy('dateAdded', 'desc'));
    
    if (paginate && lastVisibleJokeDocRef.current) {
      queryConstraints.push(startAfter(lastVisibleJokeDocRef.current));
    }
    queryConstraints.push(limit(PAGE_SIZE));

    return query(collection(db, JOKES_COLLECTION), ...queryConstraints);
  };

  const _fetchJokes = async (filters: FilterParams, isLoadMore: boolean) => {
    if (!user) return;

    if (isLoadMore) {
      if (!hasMoreJokes || loadingMoreJokes || !lastVisibleJokeDocRef.current) return;
      setLoadingMoreJokes(true);
    } else {
      setLoadingInitialJokes(true);
      setJokes(null); // Reset jokes for new filter/initial load
      lastVisibleJokeDocRef.current = null;
    }

    const q = _buildJokesQuery(filters, isLoadMore);
    if (!q) {
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
      // Check for Firestore permission denied or invalid query errors
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
  };

  const loadJokesWithFilters = useCallback(async (filters: FilterParams) => {
    activeFiltersRef.current = filters;
    await _fetchJokes(filters, false);
  }, [user, toast]); // _fetchJokes dependencies are handled internally or via user

  const loadMoreFilteredJokes = useCallback(async () => {
    if (!user) return;
    await _fetchJokes(activeFiltersRef.current, true);
  }, [user, toast]); // _fetchJokes dependencies are handled internally or via user


  useEffect(() => {
    if (authLoading) {
      setJokes(null);
      setCategories(null);
      setLoadingInitialJokes(true);
      setHasMoreJokes(true);
      lastVisibleJokeDocRef.current = null;
      activeFiltersRef.current = defaultFilters;
      return;
    }

    if (!user) {
      setJokes([]);
      setCategories([]);
      setLoadingInitialJokes(false);
      setHasMoreJokes(false);
      return;
    }

    // Initial load with default filters when user logs in
    loadJokesWithFilters(defaultFilters);

    const categoriesQuery = query(
      collection(db, CATEGORIES_COLLECTION),
      where('userId', '==', user.uid),
      orderBy('name', 'asc')
    );
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const processedCategories: Category[] = snapshot.docs
        .map(docSnapshot => {
          const data = docSnapshot.data();
          if (data && typeof data.name === 'string' && data.name.trim() !== '' && data.userId === user.uid) {
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

    return () => {
      unsubscribeCategories();
    };
  }, [user, authLoading, toast, loadJokesWithFilters]);


  const _ensureCategoryExistsAndAdd = async (rawCategoryName: string, userId: string): Promise<string> => {
    const categoryName = rawCategoryName.trim();
    if (!categoryName) throw new Error("Category name cannot be empty.");

    const existingCategory = categories?.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase() && cat.userId === userId);
    if (existingCategory) return existingCategory.name;

    const q = query(collection(db, CATEGORIES_COLLECTION), where('userId', '==', userId), where('name', '==', categoryName));
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) return querySnapshot.docs[0].data().name;
      
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
        // Refresh jokes list with current filters to show the new joke if it matches
        await _fetchJokes(activeFiltersRef.current, false);
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
        await _fetchJokes(activeFiltersRef.current, false);
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
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) throw new Error("Joke not found or permission denied.");
        
        await updateDoc(jokeDocRef, { used: !currentUsedStatus });
        // Optimistically update local state or rely on re-fetch if filters change behavior
        setJokes(prevJokes => prevJokes?.map(j => j.id === id ? {...j, used: !currentUsedStatus} : j) ?? null);
        // If showOnlyUsed filter is active, a re-fetch might be needed if this change affects visibility
        if (activeFiltersRef.current.showOnlyUsed) {
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
        toast({ title: 'Authentication Required', description: 'Please log in.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, id);
      try {
         const docSnap = await getDoc(jokeDocRef);
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) throw new Error("Joke not found or permission denied.");
        
        await updateDoc(jokeDocRef, { funnyRate: rating });
        setJokes(prevJokes => prevJokes?.map(j => j.id === id ? {...j, funnyRate: rating} : j) ?? null);
        // If funnyRate filter is active, a re-fetch might be needed
        if (activeFiltersRef.current.filterFunnyRate !== -1 && activeFiltersRef.current.filterFunnyRate !== rating) {
             await _fetchJokes(activeFiltersRef.current, false); // Or if it now matches a filter it didn't before
        } else if (activeFiltersRef.current.filterFunnyRate === rating) {
            // If it was not matching and now it is, and it's not in the list, it won't appear without a re-fetch.
            // This optimistic update only works for items already in `jokes`.
            // A full re-fetch is safer if the change might alter its filtered visibility.
            // Consider if _fetchJokes is needed if the rating makes it match/unmatch the current filter.
            const currentJoke = jokes?.find(j => j.id === id);
            if (currentJoke && currentJoke.funnyRate !== activeFiltersRef.current.filterFunnyRate && rating === activeFiltersRef.current.filterFunnyRate) {
                 await _fetchJokes(activeFiltersRef.current, false);
            } else if (currentJoke && currentJoke.funnyRate === activeFiltersRef.current.filterFunnyRate && rating !== activeFiltersRef.current.filterFunnyRate) {
                 await _fetchJokes(activeFiltersRef.current, false);
            }
        }

      } catch (error: any) {
        console.error('Error rating joke:', error);
        toast({ title: 'Error', description: error.message || 'Failed to rate joke.', variant: 'destructive' });
      }
    },
    [toast, user, jokes, _fetchJokes]
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
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) throw new Error("Joke not found or permission denied.");

        const finalCategoryName = await _ensureCategoryExistsAndAdd(newRawCategoryName, user.uid);
        await updateDoc(jokeDocRef, { category: finalCategoryName });
        toast({ title: 'Category Updated', description: 'Joke category changed successfully.'});
        // Re-fetch if category filter is active or if the new category could affect its visibility
        if (activeFiltersRef.current.selectedCategories.length > 0 || 
            jokes?.find(j => j.id === jokeId)?.category !== finalCategoryName) {
            await _fetchJokes(activeFiltersRef.current, false);
        } else {
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
     if (!user) return null;
     const jokeDocRef = doc(db, JOKES_COLLECTION, jokeId);
     try {
        const docSnap = await getDoc(jokeDocRef);
        if (docSnap.exists() && docSnap.data()?.userId === user.uid) {
            const data = docSnap.data();
            return { id: docSnap.id, ...data, dateAdded: (data.dateAdded as Timestamp).toDate() } as Joke;
        }
        return null;
     } catch (error) {
        console.error(`Error fetching joke ${jokeId}:`, error);
        toast({ title: 'Error', description: 'Could not fetch joke details.', variant: 'destructive'});
        return null;
     }
  }, [user, toast]);

   const updateJoke = useCallback(async (jokeId: string, updatedData: UpdateJokeData) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to update a joke.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, jokeId);
      const dataToUpdate: Record<string, any> = {};
      try {
         const docSnap = await getDoc(jokeDocRef);
         if (!docSnap.exists() || docSnap.data()?.userId !== user.uid) throw new Error("Joke not found or permission denied.");

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
         // A full re-fetch ensures the list is accurate according to current filters
         await _fetchJokes(activeFiltersRef.current, false);
      } catch (error: any) {
          console.error(`Error updating joke ${jokeId}:`, error);
           if (!(error instanceof Error && error.message.includes("Category"))) {
             toast({ title: 'Error Updating Joke', description: error.message || 'Failed to update joke.', variant: 'destructive' });
           }
           throw error;
      }
   }, [user, toast, categories, _fetchJokes]);

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
    loadMoreFilteredJokes, // Changed from loadMoreJokes
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

