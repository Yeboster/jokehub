
"use client";

import type { Joke, Category, UserRating } from '@/lib/types';
import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import * as jokeService from '@/services/jokeService';
import * as categoryService from '@/services/categoryService';
import * as ratingService from '@/services/ratingService';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

export type FilterParams = jokeService.FilterParams;

interface JokeContextProps {
  jokes: Joke[] | null;
  categories: Category[] | null; // This will now hold all categories from the collection
  hasMoreJokes: boolean;
  loadingInitialJokes: boolean;
  loadingMoreJokes: boolean;
  addJoke: (newJokeData: { text: string; category: string; funnyRate?: number }) => Promise<void>;
  importJokes: (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => Promise<void>;
  toggleUsed: (id: string, currentUsedStatus: boolean) => Promise<void>;
  rateJoke: (id: string, rating: number) => Promise<void>;
  updateJokeCategory: (jokeId: string, newCategoryName: string) => Promise<void>;
  getJokeById: (jokeId: string) => Promise<Joke | null>;
  updateJoke: (jokeId: string, updatedData: Partial<Omit<Joke, 'id' | 'dateAdded' | 'userId'>>) => Promise<void>;
  loadJokesWithFilters: (filters: FilterParams) => Promise<void>;
  loadMoreFilteredJokes: () => Promise<void>;
  submitUserRating: (jokeId: string, stars: number, comment?: string) => Promise<void>;
  getUserRatingForJoke: (jokeId: string) => Promise<UserRating | null>;
  fetchAllRatingsForJoke: (jokeId: string) => Promise<UserRating[]>;
}

const JokeContext = createContext<JokeContextProps | undefined>(undefined);

const defaultFilters: FilterParams = {
  selectedCategories: [],
  filterFunnyRate: -1,
  usageStatus: 'all',
  scope: 'public',
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

  // Effect for loading ALL categories (independent of user for the list itself)
  useEffect(() => {
    if (authLoading) {
      setCategories(null); // Clear categories if auth is (re)loading
      return;
    }
    const unsubscribe = categoryService.subscribeToAllCategoriesFromCollection(
      (newCategories) => {
        setCategories(newCategories);
      },
      (error) => {
        console.error('Error in category subscription (JokeContext):', error);
        toast({ title: 'Error fetching system categories', description: error.message, variant: 'destructive' });
        setCategories([]); // Set to empty array on error to signify data attempted to load
      }
    );
    return () => unsubscribe();
  }, [authLoading, toast]);

  const fetchJokesInternal = useCallback(async (filters: FilterParams, isLoadMore: boolean) => {
    if (filters.scope === 'user' && !user) {
      setJokes([]);
      setHasMoreJokes(false);
      if (isLoadMore) setLoadingMoreJokes(false); else setLoadingInitialJokes(false);
      return;
    }

    if (isLoadMore) {
      if (!hasMoreJokes || loadingMoreJokes) return;
      setLoadingMoreJokes(true);
    } else {
      setLoadingInitialJokes(true);
      setJokes(null); // Clear previous jokes for a new filter set
      lastVisibleJokeDocRef.current = null; // Reset pagination
    }

    try {
      const {
        jokes: newJokes,
        lastVisible,
        hasMore: newHasMore,
      } = await jokeService.fetchJokes(
        filters,
        user?.uid,
        isLoadMore ? lastVisibleJokeDocRef.current : undefined
      );

      if (isLoadMore) {
        setJokes((prevJokes) => (prevJokes ? [...prevJokes, ...newJokes] : newJokes));
      } else {
        setJokes(newJokes);
      }

      lastVisibleJokeDocRef.current = lastVisible;
      setHasMoreJokes(newHasMore);
    } catch (error: any) {
      console.error('Error fetching jokes (JokeContext):', error);
      toast({ title: 'Error', description: error.message || 'Could not load jokes.', variant: 'destructive' });
      if (!isLoadMore) setJokes([]); // Set to empty on error for initial load
      setHasMoreJokes(false);
    } finally {
      if (isLoadMore) setLoadingMoreJokes(false);
      else setLoadingInitialJokes(false);
    }
  }, [user, toast, hasMoreJokes, loadingMoreJokes]); // Dependencies for fetchJokesInternal

  const loadJokesWithFilters = useCallback(
    async (filters: FilterParams) => {
      activeFiltersRef.current = filters; // Update active filters
      await fetchJokesInternal(filters, false); // Call internal fetch logic
    },
    [fetchJokesInternal] // fetchJokesInternal is memoized
  );
  
  const loadMoreFilteredJokes = useCallback(async () => {
    await fetchJokesInternal(activeFiltersRef.current, true);
  }, [fetchJokesInternal]);


  // Effect for loading JOKES based on filters, user, and ensuring categories are loaded first
  useEffect(() => {
    if (authLoading || categories === null) { // Wait for auth and categories to be loaded (or attempted)
      setJokes(null); // Clear jokes if dependencies are not ready
      setLoadingInitialJokes(true); // Indicate loading
      return;
    }

    const currentFilters = activeFiltersRef.current;
    let filtersToUse = currentFilters;

    if (!user && currentFilters.scope === 'user') {
      // If logged out and scope was 'user', switch to 'public'
      filtersToUse = { ...currentFilters, scope: 'public' as const };
      // activeFiltersRef will be updated by loadJokesWithFilters call
    }
    
    loadJokesWithFilters(filtersToUse);

  }, [authLoading, user, categories, loadJokesWithFilters]); // Now also depends on `categories`


  const handleApiCall = useCallback(
    async <T,>(
      apiCall: () => Promise<T>,
      successMessage: string,
      shouldReloadJokesList = false // Changed from shouldReloadJokes to be more specific
    ): Promise<T | undefined> => {
      if (!user && !['fetchAllRatingsForJoke', 'getJokeById'].includes(apiCall.name) ) { // Allow specific calls when logged out
        toast({
          title: 'Authentication Required',
          description: 'Please log in.',
          variant: 'destructive',
        });
        return undefined;
      }
      try {
        const result = await apiCall();
        if (successMessage) {
            toast({ title: 'Success', description: successMessage });
        }
        if (shouldReloadJokesList && (user || activeFiltersRef.current.scope === 'public')) { // Reload if user is logged in OR if current scope is public
          await loadJokesWithFilters(activeFiltersRef.current); // Use the centralized loading function
        }
        return result;
      } catch (error: any) {
        console.error('API call error (JokeContext):', error);
        // Avoid duplicate toasts if service layer already toasted
        if (!(error.message.includes("Category name cannot be empty") || error.message.includes("permission denied"))) {
             toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
        }
        throw error; // Re-throw to allow specific handling in components if needed
      }
    },
    [user, toast, loadJokesWithFilters] // Added loadJokesWithFilters
  );

  const addJoke = useCallback(
    (newJokeData: { text: string; category: string; funnyRate?: number }) => {
       if (!user) throw new Error("User not authenticated for adding joke.");
       return handleApiCall(() => jokeService.addJoke(newJokeData, user.uid), 'Joke added successfully!', true)!;
    },
    [handleApiCall, user]
  );

  const importJokes = useCallback(
    (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => {
      if (!user) throw new Error("User not authenticated for importing jokes.");
      return handleApiCall(
        () => jokeService.importJokes(importedJokesData, user.uid),
        `Processed ${importedJokesData.length} jokes.`,
        true
      )!;
    },
    [handleApiCall, user]
  );

  const toggleUsed = useCallback(
    async (id: string, currentUsedStatus: boolean) => { 
      if (!user) throw new Error("User not authenticated for toggling joke status.");
      await handleApiCall(
        () => jokeService.toggleJokeUsed(id, user.uid), 
        'Joke status updated.',
        false 
      );
      // Manually update local state for responsiveness if list isn't fully reloaded
      setJokes((prevJokes) =>
        prevJokes
          ? prevJokes.map((j) => (j.id === id ? { ...j, used: !currentUsedStatus } : j))
          : null
      );
    },
    [handleApiCall, user]
  );

  const rateJoke = useCallback( // This function seems to update owner's funnyRate, distinct from user ratings
    async (id: string, rating: number) => {
      if (!user) throw new Error("User not authenticated for rating joke.");
      await handleApiCall(() => jokeService.rateJoke(id, rating, user.uid), 'Joke rated successfully.', false);
      setJokes((prevJokes) =>
        prevJokes
          ? prevJokes.map((j) => (j.id === id ? { ...j, funnyRate: rating } : j))
          : null
      );
    },
    [handleApiCall, user]
  );

  const updateJokeCategory = useCallback(
    (jokeId: string, newCategoryName: string) => {
      if (!user) throw new Error("User not authenticated for updating joke category.");
      return handleApiCall(
        () => jokeService.updateJokeCategory(jokeId, newCategoryName, user.uid),
        'Joke category updated.',
        true // Reload list as category change might affect filtering
      )!;
    },
    [handleApiCall, user]
  );

  const getJokeById = useCallback(
    async (jokeId: string): Promise<Joke | null> => {
      // This can be called by anyone
      try {
        const joke = await jokeService.getJokeById(jokeId);
        return joke;
      } catch (error: any) {
        console.error('Error in getJokeById (JokeContext):', error);
        toast({ title: 'Error Fetching Joke', description: error.message || 'Could not fetch joke details.', variant: 'destructive' });
        return null;
      }
    },
    [toast] 
  );
  
  const updateJoke = useCallback(
    (jokeId: string, updatedData: Partial<Omit<Joke, 'id' | 'dateAdded' | 'userId'>>) => {
      if (!user) throw new Error("User not authenticated for updating joke.");
      return handleApiCall(
        () => jokeService.updateJoke(jokeId, updatedData, user.uid),
        'Joke updated successfully!',
        true // Reload list as content/category/status might change
      )!;
    },
    [handleApiCall, user]
  );

  const submitUserRating = useCallback(
    (jokeId: string, stars: number, comment?: string) => {
      if (!user) throw new Error("User not authenticated for submitting rating.");
      // Reloading jokes list after rating is implicitly handled by jokeService.submitUserRating 
      // which updates the joke's averageRating and ratingCount, triggering list item re-render if visible.
      // A full list reload might be desired if averageRating is a filter criteria that changes.
      // For now, not forcing full reload from here to keep it efficient.
      return handleApiCall(
        () => ratingService.submitUserRating(jokeId, stars, user.uid, comment),
        'Rating submitted successfully.',
        true // Force reload to update averageRating display on list items.
      )!;
    },
    [handleApiCall, user]
  );

  const getUserRatingForJoke = useCallback(
    (jokeId: string) => {
      if (!user) return Promise.resolve(null); 
      return ratingService.getUserRatingForJoke(jokeId, user.uid).catch(error => {
        console.error("Error fetching user rating in context:", error);
        toast({title: "Error", description: "Could not fetch your rating.", variant: "destructive"});
        return null; 
      });
    },
    [user, toast]
  );

  const fetchAllRatingsForJoke = useCallback(
    async (jokeId: string): Promise<UserRating[]> => {
      // This can be called by anyone to see community ratings
      try {
        return await ratingService.fetchAllRatingsForJoke(jokeId);
      } catch (error: any) {
        console.error('Error fetching all ratings in context:', error);
        toast({ title: 'Error', description: 'Could not load community ratings.', variant: 'destructive' });
        return []; 
      }
    },
    [toast]
  );

  const value: JokeContextProps = {
    jokes,
    categories,
    hasMoreJokes,
    loadingInitialJokes,
    loadingMoreJokes,
    addJoke,
    importJokes,
    toggleUsed,
    rateJoke,
    updateJokeCategory,
    getJokeById,
    updateJoke,
    loadJokesWithFilters,
    loadMoreFilteredJokes,
    submitUserRating,
    getUserRatingForJoke,
    fetchAllRatingsForJoke,
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
