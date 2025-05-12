
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/header';
import JokeFilters from '@/components/joke-filters';
import JokeList from '@/components/joke-list';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Laugh, ChevronDown } from 'lucide-react';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const {
    jokes,
    categories,
    loadMoreJokes,
    hasMoreJokes,
    loadingInitialJokes,
    loadingMoreJokes
   } = useJokes();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUsed, setShowUsed] = useState<boolean>(true);
  const [showUnused, setShowUnused] = useState<boolean>(true);
  const [filterFunnyRate, setFilterFunnyRate] = useState<number>(-1);

  const filteredJokes = useMemo(() => {
    if (!jokes) return [];
    return jokes.filter(joke => {
      const categoryMatch = selectedCategory === 'all' || joke.category === selectedCategory;
      const usageMatch = (showUsed && joke.used) || (showUnused && !joke.used);
      const usageFilterActive = showUsed || showUnused;
      const funnyRateMatch = filterFunnyRate === -1 || joke.funnyRate === filterFunnyRate;

      return categoryMatch && (usageFilterActive ? usageMatch : true) && funnyRateMatch;
    });
  }, [jokes, selectedCategory, showUsed, showUnused, filterFunnyRate]);

  // Handle overall loading state (Auth + Initial Jokes)
  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  // Handle logged out state
  if (!user) {
    return (
      <div className="container mx-auto p-4 md:p-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Laugh className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold mb-2">Welcome to Joke Hub!</h1>
        <p className="text-muted-foreground mb-6 text-lg max-w-md">
          Please log in or sign up to view, add, and manage your personal collection of jokes.
        </p>
        <Button asChild size="lg">
          <Link href="/auth">Get Started</Link>
        </Button>
      </div>
    );
  }

  // Handle initial data loading for logged-in user
  if (loadingInitialJokes || categories === null || jokes === null) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading your jokes...</p>
      </div>
    );
  }

  // Main content when logged in and data is loaded
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Header title="Your Personal Joke Hub" />

      <div className="mb-8">
        <JokeFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          showUsed={showUsed}
          onShowUsedChange={setShowUsed}
          showUnused={showUnused}
          onShowUnusedChange={setShowUnused}
          filterFunnyRate={filterFunnyRate}
          onFilterFunnyRateChange={setFilterFunnyRate}
        />
      </div>

      <Separator className="my-8" />

      <h2 className="text-2xl font-semibold mb-4 text-primary">Your Jokes</h2>
      <JokeList jokes={filteredJokes} />

      {/* Load More Button */}
      <div className="mt-8 text-center">
        {hasMoreJokes ? (
          <Button
            onClick={loadMoreJokes}
            disabled={loadingMoreJokes}
            variant="outline"
            size="lg"
          >
            {loadingMoreJokes ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ChevronDown className="mr-2 h-5 w-5" />
            )}
            {loadingMoreJokes ? 'Loading...' : 'Load More Jokes'}
          </Button>
        ) : (
          jokes.length > 0 && <p className="text-muted-foreground">No more jokes to load.</p>
        )}
      </div>
    </div>
  );
}

    