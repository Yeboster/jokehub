
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/header';
import JokeList from '@/components/joke-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Laugh, ChevronDown, ListFilter, RotateCcw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';


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
  const [showOnlyUsed, setShowOnlyUsed] = useState<boolean>(false); // Changed from showUsed/showUnused, default false
  const [filterFunnyRate, setFilterFunnyRate] = useState<number>(-1);

  const categoryNames = useMemo(() => {
    if (!categories) return [];
    return categories.map(cat => cat.name).sort();
  }, [categories]);

  const filteredJokes = useMemo(() => {
    if (!jokes) return [];
    return jokes.filter(joke => {
      const categoryMatch = selectedCategory === 'all' || joke.category === selectedCategory;
      // If showOnlyUsed is true, only show jokes where joke.used is true.
      // If showOnlyUsed is false, show all jokes (usageMatch is true).
      const usageMatch = showOnlyUsed ? joke.used === true : true;
      const funnyRateMatch = filterFunnyRate === -1 || joke.funnyRate === filterFunnyRate;

      return categoryMatch && usageMatch && funnyRateMatch;
    });
  }, [jokes, selectedCategory, showOnlyUsed, filterFunnyRate]); // Updated dependencies

  const handleClearFilters = () => {
    setSelectedCategory('all');
    setFilterFunnyRate(-1);
    setShowOnlyUsed(false); // Reset to default (show all)
  };

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

      {/* New Filter Bar */}
      <div className="mb-6 p-4 border-b flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex items-center text-lg font-semibold text-primary mr-2 shrink-0">
          <ListFilter className="mr-2 h-5 w-5" />
          Filters
        </div>

        {/* Category Filter */}
        <div className="space-y-1.5 min-w-[150px] flex-grow sm:flex-grow-0">
          <Label htmlFor="category-filter">Category</Label>
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            disabled={categories === null || categories.length === 0}
          >
            <SelectTrigger id="category-filter">
              <SelectValue placeholder={categories === null ? "Loading..." : "Select category"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryNames.map((categoryName) => (
                <SelectItem key={categoryName} value={categoryName}>
                  {categoryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Funny Rate Filter */}
        <div className="space-y-1.5 min-w-[150px] flex-grow sm:flex-grow-0">
          <Label htmlFor="funny-rate-filter">Rating</Label>
          <Select
            value={filterFunnyRate.toString()}
            onValueChange={(value) => setFilterFunnyRate(parseInt(value, 10))}
          >
            <SelectTrigger id="funny-rate-filter">
              <SelectValue placeholder="Select rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-1">Any Rating</SelectItem>
              <SelectItem value="0">Unrated</SelectItem>
              {[1, 2, 3, 4, 5].map(rate => (
                <SelectItem key={rate} value={rate.toString()}>
                  {rate} Star{rate > 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Usage Status Filter */}
        <div className="space-y-1.5 min-w-[100px] flex-grow sm:flex-grow-0"> {/* Adjusted min-width */}
          <Label>Usage</Label> {/* Changed group label */}
          <div className="flex items-center space-x-2 pt-1">
            <Switch
              id="show-only-used"
              checked={showOnlyUsed}
              onCheckedChange={setShowOnlyUsed}
              aria-label="Show only used jokes"
            />
            <Label htmlFor="show-only-used" className="font-normal">Used</Label> {/* Simplified label */}
          </div>
        </div>
        
        <Button variant="outline" onClick={handleClearFilters} className="ml-auto sm:ml-4">
          <RotateCcw className="mr-2 h-4 w-4" /> Clear Filters
        </Button>
      </div>

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

