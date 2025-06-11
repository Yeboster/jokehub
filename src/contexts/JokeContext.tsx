
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
  categories: Category[] | null;
  hasMoreJokes: boolean;
  loadingInitialJokes: boolean;
  loadingMoreJokes: boolean;
  addJoke: (newJokeData: { text: string; category: string; funnyRate?: number }) => Promise<void>;
  importJokes: (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => Promise<void>;
  toggleUsed: (id: string, currentUsedStatus: boolean) => Promise<void>; // Updated to accept currentUsedStatus
  rateJoke: (id: string, rating: number) => Promise<void>;
  updateJokeCategory: (jokeId: string, newCategoryName: string) => Promise<void>;
  getJokeById: (jokeId: string) => Promise<Joke | null>;
  updateJoke: (jokeId: string, updatedData: Partial<Omit<Joke, 'id' | 'dateAdded' | 'userId'>>) => Promise<void>;
  loadJokesWithFilters: (filters: FilterParams) => Promise<void>;
  loadMoreFilteredJokes: () => Promise<void>;
  submitUserRating: (jokeId: string, ratingValue: number, comment?: string) => Promise<void>;
  getUserRatingForJoke: (jokeId: string) => Promise<UserRating | null>;
  fetchAllRatingsForJoke: (jokeId: string) => Promise<UserRating[]>; // New function
}

const JokeContext = createContext<JokeContextProps | undefined>(undefined);

const defaultFilters: FilterParams = {
  selectedCategories: [],
  filterFunnyRate: -1,
  showOnlyUsed: false,
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

  const fetchJokes = useCallback(async (filters: FilterParams, isLoadMore: boolean) => {
    if (filters.scope === 'user' && !user) {
      setJokes([]);
      setHasMoreJokes(false);
      setLoadingInitialJokes(false);
      setLoadingMoreJokes(false);
      return;
    }

    if (isLoadMore) {
      if (!hasMoreJokes || loadingMoreJokes) return;
      setLoadingMoreJokes(true);
    } else {
      setLoadingInitialJokes(true);
      setJokes(null);
      lastVisibleJokeDocRef.current = null;
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
      console.error('Error fetching jokes:', error);
      toast({ title: 'Error', description: 'Could not load jokes.', variant: 'destructive' });
      if (!isLoadMore) setJokes([]);
      setHasMoreJokes(false);
    } finally {
      if (isLoadMore) setLoadingMoreJokes(false);
      else setLoadingInitialJokes(false);
    }
  }, [user, toast, hasMoreJokes, loadingMoreJokes]);

  const loadJokesWithFilters = useCallback(
    async (filters: FilterParams) => {
      activeFiltersRef.current = filters;
      await fetchJokes(filters, false);
    },
    [fetchJokes]
  );

  const loadMoreFilteredJokes = useCallback(async () => {
    await fetchJokes(activeFiltersRef.current, true);
  }, [fetchJokes]);

  useEffect(() => {
    if (authLoading) {
      setJokes(null);
      setCategories(null);
      setLoadingInitialJokes(true);
      return;
    }
    if (!user) {
        loadJokesWithFilters({ ...defaultFilters, scope: 'public' });
        categoryService.subscribeToCategories(
          "public", // A placeholder or handle public categories differently if needed
          (newCategories) => setCategories(newCategories),
          (error) => {
            toast({ title: 'Error fetching public categories', description: error.message, variant: 'destructive' });
            setCategories([]);
          }
        );
        return;
    }

    const unsubscribeCategories = categoryService.subscribeToCategories(
      user.uid,
      (newCategories) => {
        setCategories(newCategories);
      },
      (error) => {
        toast({ title: 'Error fetching categories', description: error.message, variant: 'destructive' });
        setCategories([]);
      }
    );
    
    loadJokesWithFilters(activeFiltersRef.current);


    return () => unsubscribeCategories();
  }, [authLoading, user, toast, loadJokesWithFilters]);

  const handleApiCall = useCallback(
    async <T,>(
      apiCall: () => Promise<T>,
      successMessage: string,
      shouldReloadJokes = false
    ): Promise<T | undefined> => {
      if (!user && !['fetchAllRatingsForJoke', 'getJokeById'].includes(apiCall.name) ) { // Allow some calls even if not logged in
        toast({
          title: 'Authentication Required',
          description: 'Please log in.',
          variant: 'destructive',
        });
        return;
      }
      try {
        const result = await apiCall();
        if (successMessage) {
            toast({ title: 'Success', description: successMessage });
        }
        if (shouldReloadJokes && user) { // Only reload if user is logged in and action likely affects their jokes
          await fetchJokes(activeFiltersRef.current, false);
        }
        return result;
      } catch (error: any) {
        console.error('API call error:', error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        throw error;
      }
    },
    [user, toast, fetchJokes]
  );

  const addJoke = useCallback(
    (newJokeData: { text: string; category: string; funnyRate?: number }) => {
       if (!user) throw new Error("User not authenticated");
       return handleApiCall(() => jokeService.addJoke(newJokeData, user.uid), 'Joke added successfully!', true)!;
    },
    [handleApiCall, user]
  );

  const importJokes = useCallback(
    (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => {
      if (!user) throw new Error("User not authenticated");
      return handleApiCall(
        () => jokeService.importJokes(importedJokesData, user.uid),
        `Processed ${importedJokesData.length} jokes.`,
        true
      )!;
    },
    [handleApiCall, user]
  );

  const toggleUsed = useCallback(
    async (id: string, currentUsedStatus: boolean) => { // Accept currentUsedStatus
      if (!user) throw new Error("User not authenticated");
      await handleApiCall(
        () => jokeService.toggleJokeUsed(id, user.uid), // Service might not need currentUsedStatus
        'Joke status updated.',
        false // Do not reload all jokes, update locally
      );
      // Local update of the specific joke's 'used' status
      setJokes((prevJokes) =>
        prevJokes
          ? prevJokes.map((j) => (j.id === id ? { ...j, used: !currentUsedStatus } : j))
          : null
      );
    },
    [handleApiCall, user]
  );

  const rateJoke = useCallback(
    async (id: string, rating: number) => {
      if (!user) throw new Error("User not authenticated");
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
      if (!user) throw new Error("User not authenticated");
      return handleApiCall(
        () => jokeService.updateJokeCategory(jokeId, newCategoryName, user.uid),
        'Joke category updated.',
        true
      )!;
    },
    [handleApiCall, user]
  );

  const getJokeById = useCallback(
    (jokeId: string) => handleApiCall(() => jokeService.getJokeById(jokeId), '')!, // No success message for get
    [handleApiCall]
  );

  const updateJoke = useCallback(
    (jokeId: string, updatedData: Partial<Omit<Joke, 'id' | 'dateAdded' | 'userId'>>) => {
      if (!user) throw new Error("User not authenticated");
      return handleApiCall(
        () => jokeService.updateJoke(jokeId, updatedData, user.uid),
        'Joke updated successfully!',
        true
      )!;
    },
    [handleApiCall, user]
  );

  const submitUserRating = useCallback(
    (jokeId: string, ratingValue: number, comment?: string) => {
      if (!user) throw new Error("User not authenticated");
      return handleApiCall(
        () => ratingService.submitUserRating(jokeId, ratingValue, user.uid, comment),
        'Rating submitted successfully.'
        // No full joke reload needed here, but might want to refetch ratings for the joke page
      )!;
    },
    [handleApiCall, user]
  );

  const getUserRatingForJoke = useCallback(
    (jokeId: string) => {
      if (!user) return Promise.resolve(null); // Return null if user not logged in
      // No need for generic handleApiCall here as it has specific return type and no standard success toast
      return ratingService.getUserRatingForJoke(jokeId, user.uid).catch(error => {
        console.error("Error fetching user rating in context:", error);
        toast({title: "Error", description: "Could not fetch your rating.", variant: "destructive"});
        return null; // Return null on error
      });
    },
    [user, toast]
  );

  const fetchAllRatingsForJoke = useCallback(
    async (jokeId: string): Promise<UserRating[]> => {
      try {
        return await ratingService.fetchAllRatingsForJoke(jokeId);
      } catch (error: any) {
        console.error('Error fetching all ratings in context:', error);
        toast({ title: 'Error', description: 'Could not load community ratings.', variant: 'destructive' });
        return []; // Return empty array on error
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
    fetchAllRatingsForJoke, // Add new function to context value
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


    