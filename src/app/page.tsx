"use client";

import { useState, useMemo } from 'react';
import { useJokes } from '@/contexts/JokeContext'; // Import useJokes hook
import Header from '@/components/header';
import JokeFilters from '@/components/joke-filters';
import JokeList from '@/components/joke-list';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const { jokes, toggleUsed } = useJokes(); // Get jokes and toggleUsed from context
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUsed, setShowUsed] = useState<boolean>(true);
  const [showUnused, setShowUnused] = useState<boolean>(true);

  const uniqueCategories = useMemo(() => {
    if (!jokes) return [];
    const categories = new Set(jokes.map(joke => joke.category));
    return Array.from(categories).sort();
  }, [jokes]);

  const filteredJokes = useMemo(() => {
    if (!jokes) return [];
    return jokes.filter(joke => {
      const categoryMatch = selectedCategory === 'all' || joke.category === selectedCategory;
      const usageMatch = (showUsed && joke.used) || (showUnused && !joke.used);
      // If neither showUsed nor showUnused is checked, show nothing related to usage
      const usageFilterActive = showUsed || showUnused;
      return categoryMatch && (!usageFilterActive || usageMatch);
    });
  }, [jokes, selectedCategory, showUsed, showUnused]);

  // Handle loading state if jokes are not yet available from context/localStorage
  if (jokes === null) {
    // Optionally return a loading skeleton here
    return <div className="container mx-auto p-4 md:p-8">Loading jokes...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Header title="Joke Hub" />

      <div className="mb-8">
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

      <Separator className="my-8" />

      <h2 className="text-2xl font-semibold mb-4 text-primary">Your Jokes</h2>
      <JokeList jokes={filteredJokes} onToggleUsed={toggleUsed} />

    </div>
  );
}
