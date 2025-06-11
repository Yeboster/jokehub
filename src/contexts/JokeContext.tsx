
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
  toggleUsed: (id: string) => Promise<void>;
  rateJoke: (id: string, rating: number) => Promise<void>;
  updateJokeCategory: (jokeId: string, newCategoryName: string) => Promise<void>;
  getJokeById: (jokeId: string) => Promise<Joke | null>;
  updateJoke: (jokeId: string, updatedData: Partial<Joke>) => Promise<void>;
  loadJokesWithFilters: (filters: FilterParams) => Promise<void>;
  loadMoreFilteredJokes: () => Promise<void>;
  submitUserRating: (jokeId: string, ratingValue: number, comment?: string) => Promise<void>;
  getUserRatingForJoke: (jokeId: string) => Promise<UserRating | null>;
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
        return;
    }

    const unsubscribe = categoryService.subscribeToCategories(
      user.uid,
      (newCategories) => {
        setCategories(newCategories);
      },
      (error) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        setCategories([]);
      }
    );
    
    loadJokesWithFilters(activeFiltersRef.current);


    return () => unsubscribe();
  }, [authLoading, user, toast, loadJokesWithFilters]);

  const handleApiCall = useCallback(
    async <T,>(
      apiCall: () => Promise<T>,
      successMessage: string,
      shouldReloadJokes = false
    ): Promise<T | undefined> => {
      if (!user) {
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
        if (shouldReloadJokes) {
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
    (newJokeData: { text: string; category: string; funnyRate?: number }) =>
      handleApiCall(() => jokeService.addJoke(newJokeData, user!.uid), 'Joke added successfully!', true)!,
    [handleApiCall, user]
  );

  const importJokes = useCallback(
    (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) =>
      handleApiCall(
        () => jokeService.importJokes(importedJokesData, user!.uid),
        `Processed ${importedJokesData.length} jokes.`,
        true
      )!,
    [handleApiCall, user]
  );

  const toggleUsed = useCallback(
    async (id: string) => {
      await handleApiCall(
        () => jokeService.toggleJokeUsed(id, user!.uid),
        'Joke status updated.',
        false
      );
      setJokes((prevJokes) =>
        prevJokes
          ? prevJokes.map((j) => (j.id === id ? { ...j, used: !j.used } : j))
          : null
      );
    },
    [handleApiCall, user]
  );

  const rateJoke = useCallback(
    async (id: string, rating: number) => {
      await handleApiCall(() => jokeService.rateJoke(id, rating, user!.uid), 'Joke rated successfully.', false);
      setJokes((prevJokes) =>
        prevJokes
          ? prevJokes.map((j) => (j.id === id ? { ...j, funnyRate: rating } : j))
          : null
      );
    },
    [handleApiCall, user]
  );

  const updateJokeCategory = useCallback(
    (jokeId: string, newCategoryName: string) =>
      handleApiCall(
        () => jokeService.updateJokeCategory(jokeId, newCategoryName, user!.uid),
        'Joke category updated.',
        true
      )!,
    [handleApiCall, user]
  );

  const getJokeById = useCallback(
    (jokeId: string) => handleApiCall(() => jokeService.getJokeById(jokeId), '')!,
    [handleApiCall]
  );

  const updateJoke = useCallback(
    (jokeId: string, updatedData: Partial<Joke>) =>
      handleApiCall(
        () => jokeService.updateJoke(jokeId, updatedData, user!.uid),
        'Joke updated successfully!',
        true
      )!,
    [handleApiCall, user]
  );

  const submitUserRating = useCallback(
    (jokeId: string, ratingValue: number, comment?: string) =>
      handleApiCall(
        () => ratingService.submitUserRating(jokeId, ratingValue, user!.uid, comment),
        'Rating submitted successfully.'
      )!,
    [handleApiCall, user]
  );

  const getUserRatingForJoke = useCallback(
    (jokeId: string) =>
      user ? ratingService.getUserRatingForJoke(jokeId, user.uid) : Promise.resolve(null),
    [user]
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
