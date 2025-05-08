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
import { Loader2, Laugh } from 'lucide-react';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  // jokes and categories can be null if loading from JokeContext
  const { jokes, categories } = useJokes(); 
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUsed, setShowUsed] = useState<boolean>(true);
  const [showUnused, setShowUnused] = useState<boolean>(true);
  const [filterFunnyRate, setFilterFunnyRate] = useState<number>(-1);

  // uniqueCategories memo removed, JokeFilters gets categories from context

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

  if (authLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading authentication...</p>
      </div>
    );
  }

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
  
  // User is logged in, but jokes or categories might still be loading
  if (jokes === null || categories === null) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading your data from the cosmic cloud...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Header title="Your Personal Joke Hub" />

      <div className="mb-8">
        {/* JokeFilters no longer needs categories prop, it gets them from context */}
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

    </div>
  );
}
