"use client";

import type { Joke } from '@/lib/types';
import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Function to generate a simple unique ID
const generateId = (): string => `joke_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

interface JokeContextProps {
  jokes: Joke[] | null; // null indicates loading state
  addJoke: (newJokeData: { text: string; category: string; funnyRate?: number }) => void;
  importJokes: (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded'>[]) => void;
  toggleUsed: (id: string) => void;
  rateJoke: (id: string, rating: number) => void;
}

const JokeContext = createContext<JokeContextProps | undefined>(undefined);

export const JokeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jokes, setJokes] = useState<Joke[] | null>(null); // Initialize with null for loading state
  const [isClient, setIsClient] = useState(false);

  // Effect to load jokes from localStorage on mount (client-side only)
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedJokes = localStorage.getItem('jokes');
      let initialJokes: Joke[] = [];
      if (storedJokes) {
        try {
          // Need to parse date strings back into Date objects and handle funnyRate
          initialJokes = JSON.parse(storedJokes).map((joke: any) => ({
            ...joke,
            dateAdded: new Date(joke.dateAdded),
            funnyRate: joke.funnyRate !== undefined ? joke.funnyRate : 0, // Default if missing
          }));
        } catch (e) {
          console.error("Failed to parse jokes from localStorage", e);
          localStorage.removeItem('jokes'); // Clear invalid data
        }
      }
      setJokes(initialJokes); // Set initial jokes (or empty array if none/error)
    }
  }, []);

  // Effect to save jokes to localStorage whenever they change (client-side only)
  useEffect(() => {
    if (isClient && jokes !== null) { // Only save if client and not in initial loading state
      localStorage.setItem('jokes', JSON.stringify(jokes));
    }
  }, [jokes, isClient]);

  const addJoke = useCallback((newJokeData: { text: string; category: string; funnyRate?: number }) => {
    const newJoke: Joke = {
      id: generateId(),
      text: newJokeData.text,
      category: newJokeData.category,
      funnyRate: newJokeData.funnyRate !== undefined ? newJokeData.funnyRate : 0,
      dateAdded: new Date(),
      used: false,
    };
    setJokes((prevJokes) => (prevJokes ? [newJoke, ...prevJokes] : [newJoke]));
  }, []);

  const importJokes = useCallback((importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded'>[]) => {
    const newJokes: Joke[] = importedJokesData.map(jokeData => ({
      id: generateId(),
      ...jokeData,
      funnyRate: jokeData.funnyRate !== undefined ? jokeData.funnyRate : 0,
      dateAdded: new Date(),
      used: false,
    }));
    setJokes(prevJokes => (prevJokes ? [...newJokes, ...prevJokes] : newJokes));
  }, []);

  const toggleUsed = useCallback((id: string) => {
    setJokes(prevJokes =>
      prevJokes
        ? prevJokes.map(joke =>
            joke.id === id ? { ...joke, used: !joke.used } : joke
          )
        : []
    );
  }, []);

  const rateJoke = useCallback((id: string, rating: number) => {
    setJokes(prevJokes =>
      prevJokes
        ? prevJokes.map(joke =>
            joke.id === id ? { ...joke, funnyRate: rating } : joke
          )
        : []
    );
  }, []);

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
