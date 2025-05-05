"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Joke } from '@/lib/types';
import Header from '@/components/header';
import AddJokeForm from '@/components/add-joke-form';
import CSVImport from '@/components/csv-import';
import JokeFilters from '@/components/joke-filters';
import JokeList from '@/components/joke-list';
import { Toaster } from '@/components/ui/toaster';
import { Separator } from '@/components/ui/separator';

// Function to generate a simple unique ID
const generateId = (): string => `joke_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export default function Home() {
  const [jokes, setJokes] = useState<Joke[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUsed, setShowUsed] = useState<boolean>(true);
  const [showUnused, setShowUnused] = useState<boolean>(true);
  const [isClient, setIsClient] = useState(false);

  // Ensure localStorage access only happens on the client
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedJokes = localStorage.getItem('jokes');
      if (storedJokes) {
         try {
            // Need to parse date strings back into Date objects
            const parsedJokes = JSON.parse(storedJokes).map((joke: any) => ({
              ...joke,
              dateAdded: new Date(joke.dateAdded),
            }));
           setJokes(parsedJokes);
         } catch (e) {
           console.error("Failed to parse jokes from localStorage", e);
           localStorage.removeItem('jokes'); // Clear invalid data
         }
      }
    }
  }, []);

  // Update localStorage whenever jokes change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('jokes', JSON.stringify(jokes));
    }
  }, [jokes, isClient]);

  const handleAddJoke = (newJokeData: { text: string; category: string }) => {
    const newJoke: Joke = {
      id: generateId(),
      ...newJokeData,
      dateAdded: new Date(),
      used: false,
    };
    setJokes((prevJokes) => [newJoke, ...prevJokes]);
  };

   const handleImportJokes = (importedJokesData: Omit<Joke, 'id' | 'used' | 'dateAdded'>[]) => {
     const newJokes: Joke[] = importedJokesData.map(jokeData => ({
       id: generateId(),
       ...jokeData,
       dateAdded: new Date(),
       used: false,
     }));
     setJokes(prevJokes => [...newJokes, ...prevJokes]);
   };

   const handleToggleUsed = (id: string) => {
     setJokes(prevJokes =>
       prevJokes.map(joke =>
         joke.id === id ? { ...joke, used: !joke.used } : joke
       )
     );
   };

  const uniqueCategories = useMemo(() => {
    const categories = new Set(jokes.map(joke => joke.category));
    return Array.from(categories).sort();
  }, [jokes]);

  const filteredJokes = useMemo(() => {
    return jokes.filter(joke => {
      const categoryMatch = selectedCategory === 'all' || joke.category === selectedCategory;
      const usageMatch = (showUsed && joke.used) || (showUnused && !joke.used);
      // If neither showUsed nor showUnused is checked, show nothing related to usage
      const usageFilterActive = showUsed || showUnused;
      return categoryMatch && (!usageFilterActive || usageMatch);
    });
  }, [jokes, selectedCategory, showUsed, showUnused]);


  // Prevent rendering potentially localStorage-dependent components until mounted
  if (!isClient) {
    // Optionally return a loading skeleton here
    return null;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Header title="Joke Hub" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 space-y-6">
          <AddJokeForm onAddJoke={handleAddJoke} categories={uniqueCategories}/>
          <CSVImport onImport={handleImportJokes} />
        </div>
        <div className="md:col-span-1">
           <JokeFilters
              categories={uniqueCategories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              showUsed={showUsed}
              onShowUsedChange={setShowUsed}
              showUnused={showUnused}
              onShowUnusedChange={setShowUnused}
           />
        </div>
      </div>

      <Separator className="my-8" />

      <h2 className="text-2xl font-semibold mb-4 text-primary">Your Jokes</h2>
      <JokeList jokes={filteredJokes} onToggleUsed={handleToggleUsed} />

      <Toaster />
    </div>
  );
}
