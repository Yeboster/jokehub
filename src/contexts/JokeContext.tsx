
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
  deleteDoc, // Added for completeness, though not explicitly used in UI yet
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface JokeContextProps {
  jokes: Joke[] | null; // null indicates loading state
  addJoke: (newJokeData: { text: string; category: string; funnyRate?: number }) => Promise<void>;
  importJokes: (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded'>[]) => Promise<void>;
  toggleUsed: (id: string, currentUsedStatus: boolean) => Promise<void>;
  rateJoke: (id: string, rating: number) => Promise<void>;
  // deleteJoke: (id: string) => Promise<void>; // Example for future use
}

const JokeContext = createContext<JokeContextProps | undefined>(undefined);

const JOKES_COLLECTION = 'jokes';

export const JokeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jokes, setJokes] = useState<Joke[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, JOKES_COLLECTION), orderBy('dateAdded', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const jokesData: Joke[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          jokesData.push({
            id: doc.id,
            text: data.text,
            category: data.category,
            dateAdded: (data.dateAdded as Timestamp).toDate(),
            used: data.used,
            funnyRate: data.funnyRate !== undefined ? data.funnyRate : 0,
          });
        });
        setJokes(jokesData);
      },
      (error) => {
        console.error('Error fetching jokes from Firestore:', error);
        toast({
          title: 'Error',
          description: 'Could not load jokes. Please try again later.',
          variant: 'destructive',
        });
        setJokes([]); // Set to empty array on error to stop loading state
      }
    );

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [toast]);

  const addJoke = useCallback(
    async (newJokeData: { text: string; category: string; funnyRate?: number }) => {
      try {
        await addDoc(collection(db, JOKES_COLLECTION), {
          text: newJokeData.text,
          category: newJokeData.category,
          funnyRate: newJokeData.funnyRate !== undefined ? newJokeData.funnyRate : 0,
          dateAdded: Timestamp.now(),
          used: false,
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
    [toast]
  );

  const importJokes = useCallback(
    async (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded'>[]) => {
      const batch = writeBatch(db);
      importedJokesData.forEach((jokeData) => {
        const docRef = doc(collection(db, JOKES_COLLECTION));
        batch.set(docRef, {
          ...jokeData,
          funnyRate: jokeData.funnyRate !== undefined ? jokeData.funnyRate : 0,
          dateAdded: Timestamp.now(),
          used: false,
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
    [toast]
  );

  const toggleUsed = useCallback(
    async (id: string, currentUsedStatus: boolean) => {
      const jokeDocRef = doc(db, JOKES_COLLECTION, id);
      try {
        await updateDoc(jokeDocRef, {
          used: !currentUsedStatus,
        });
        // Toast can be added here if desired, but onSnapshot will update UI
      } catch (error) {
        console.error('Error toggling joke status in Firestore:', error);
        toast({
          title: 'Error',
          description: 'Failed to update joke status.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const rateJoke = useCallback(
    async (id: string, rating: number) => {
      const jokeDocRef = doc(db, JOKES_COLLECTION, id);
      try {
        await updateDoc(jokeDocRef, {
          funnyRate: rating,
        });
        // Toast can be added here
      } catch (error) {
        console.error('Error rating joke in Firestore:', error);
        toast({
          title: 'Error',
          description: 'Failed to rate joke.',
          variant: 'destructive',
        });
      }
    },
    [toast]
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
