
"use client";

import type { Joke } from '@/lib/types';
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
  where, // Import where for querying
  // deleteDoc, // Available if needed
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext'; // Import useAuth

interface JokeContextProps {
  jokes: Joke[] | null; // null indicates loading state
  addJoke: (newJokeData: { text: string; category: string; funnyRate?: number }) => Promise<void>;
  importJokes: (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => Promise<void>;
  toggleUsed: (id: string, currentUsedStatus: boolean) => Promise<void>;
  rateJoke: (id: string, rating: number) => Promise<void>;
}

const JokeContext = createContext<JokeContextProps | undefined>(undefined);

const JOKES_COLLECTION = 'jokes';

export const JokeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jokes, setJokes] = useState<Joke[] | null>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Get user and auth loading state

  useEffect(() => {
    // If auth is loading, or no user is logged in, don't fetch jokes / clear existing ones
    if (authLoading) {
      setJokes(null); // Indicate loading
      return;
    }
    
    if (!user) {
      setJokes([]); // No user, so no jokes to show
      return; // No cleanup needed if no subscription was made
    }

    // User is logged in, fetch their jokes
    const q = query(
      collection(db, JOKES_COLLECTION),
      where('userId', '==', user.uid), // Filter by userId
      orderBy('dateAdded', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const jokesData: Joke[] = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          jokesData.push({
            id: docSnapshot.id,
            text: data.text,
            category: data.category,
            dateAdded: (data.dateAdded as Timestamp).toDate(),
            used: data.used,
            funnyRate: data.funnyRate !== undefined ? data.funnyRate : 0,
            userId: data.userId, // Ensure userId is part of the Joke type
          });
        });
        setJokes(jokesData);
      },
      (error) => {
        console.error('Error fetching jokes from Firestore:', error);
        toast({
          title: 'Error',
          description: 'Could not load your jokes. Please try again later.',
          variant: 'destructive',
        });
        setJokes([]); // Set to empty array on error
      }
    );

    return () => unsubscribe(); // Cleanup subscription on unmount or when user/authLoading changes
  }, [user, authLoading, toast]);

  const addJoke = useCallback(
    async (newJokeData: { text: string; category: string; funnyRate?: number }) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to add a joke.', variant: 'destructive' });
        return;
      }
      try {
        await addDoc(collection(db, JOKES_COLLECTION), {
          text: newJokeData.text,
          category: newJokeData.category,
          funnyRate: newJokeData.funnyRate !== undefined ? newJokeData.funnyRate : 0,
          dateAdded: Timestamp.now(),
          used: false,
          userId: user.uid, // Associate joke with the current user
        });
        toast({
          title: 'Success',
          description: 'Joke added successfully!',
        });
      } catch (error) {
        console.error('Error adding joke to Firestore:', error);
        toast({
          title: 'Error',
          description: 'Failed to add joke.',
          variant: 'destructive',
        });
      }
    },
    [toast, user] // Add user to dependency array
  );

  const importJokes = useCallback(
    async (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => {
      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to import jokes.', variant: 'destructive' });
        return;
      }
      const batch = writeBatch(db);
      importedJokesData.forEach((jokeData) => {
        const docRef = doc(collection(db, JOKES_COLLECTION));
        batch.set(docRef, {
          ...jokeData,
          funnyRate: jokeData.funnyRate !== undefined ? jokeData.funnyRate : 0,
          dateAdded: Timestamp.now(),
          used: false,
          userId: user.uid, // Associate imported jokes with the current user
        });
      });

      try {
        await batch.commit();
        toast({
          title: 'Import Successful',
          description: `Imported ${importedJokesData.length} jokes.`,
        });
      } catch (error) {
        console.error('Error importing jokes to Firestore:', error);
        toast({
          title: 'Import Error',
          description: 'Failed to import jokes.',
          variant: 'destructive',
        });
      }
    },
    [toast, user] // Add user to dependency array
  );

  const toggleUsed = useCallback(
    async (id: string, currentUsedStatus: boolean) => {
      if (!user) { // Basic check, though Firestore rules are the main guard
        toast({ title: 'Authentication Required', description: 'Please log in.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, id);
      try {
        await updateDoc(jokeDocRef, {
          used: !currentUsedStatus,
        });
      } catch (error) {
        console.error('Error toggling joke status in Firestore:', error);
        toast({
          title: 'Error',
          description: 'Failed to update joke status.',
          variant: 'destructive',
        });
      }
    },
    [toast, user]
  );

  const rateJoke = useCallback(
    async (id: string, rating: number) => {
      if (!user) { // Basic check
        toast({ title: 'Authentication Required', description: 'Please log in.', variant: 'destructive' });
        return;
      }
      const jokeDocRef = doc(db, JOKES_COLLECTION, id);
      try {
        await updateDoc(jokeDocRef, {
          funnyRate: rating,
        });
      } catch (error) {
        console.error('Error rating joke in Firestore:', error);
        toast({
          title: 'Error',
          description: 'Failed to rate joke.',
          variant: 'destructive',
        });
      }
    },
    [toast, user]
  );

  const value = {
    jokes,
    addJoke,
    importJokes,
    toggleUsed,
    rateJoke,
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
