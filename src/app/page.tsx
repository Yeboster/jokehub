
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/header';
import JokeList from '@/components/joke-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Laugh, ChevronDown, RotateCcw, Filter as FilterIcon } from 'lucide-react'; // Added FilterIcon
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

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
  const [showOnlyUsed, setShowOnlyUsed] = useState<boolean>(false);
  const [filterFunnyRate, setFilterFunnyRate] = useState<number>(-1);

  // State for filter modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  // Temporary states for modal selections
  const [tempSelectedCategory, setTempSelectedCategory] = useState<string>(selectedCategory);
  const [tempFilterFunnyRate, setTempFilterFunnyRate] = useState<number>(filterFunnyRate);
  const [tempShowOnlyUsed, setTempShowOnlyUsed] = useState<boolean>(showOnlyUsed);

  const categoryNames = useMemo(() => {
    if (!categories) return [];
    return categories.map(cat => cat.name).sort();
  }, [categories]);

  const filteredJokes = useMemo(() => {
    if (!jokes) return [];
    return jokes.filter(joke => {
      const categoryMatch = selectedCategory === 'all' || joke.category === selectedCategory;
      const usageMatch = showOnlyUsed ? joke.used === true : true;
      const funnyRateMatch = filterFunnyRate === -1 || joke.funnyRate === filterFunnyRate;
      return categoryMatch && usageMatch && funnyRateMatch;
    });
  }, [jokes, selectedCategory, showOnlyUsed, filterFunnyRate]);

  const handleOpenFilterModal = () => {
    // Initialize temporary states with current active filters
    setTempSelectedCategory(selectedCategory);
    setTempFilterFunnyRate(filterFunnyRate);
    setTempShowOnlyUsed(showOnlyUsed);
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setSelectedCategory(tempSelectedCategory);
    setFilterFunnyRate(tempFilterFunnyRate);
    setShowOnlyUsed(tempShowOnlyUsed);
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedCategory('all');
    setFilterFunnyRate(-1);
    setShowOnlyUsed(false);
    // Also reset temp states to reflect clearing
    setTempSelectedCategory('all');
    setTempFilterFunnyRate(-1);
    setTempShowOnlyUsed(false);
  };
  
  const getFunnyRateLabel = (rate: number): string => {
    if (rate === 0) return "Unrated";
    if (rate === -1) return "Any Rating"; // Should not be displayed as a chip if -1
    return `${rate} Star${rate > 1 ? 's' : ''}`;
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

      {/* New Filter Bar with Modal Trigger and Chips */}
      <div className="mb-6 p-4 border-b flex flex-wrap items-center gap-x-4 gap-y-2">
        <Dialog open={isFilterModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { 
            // When closing dialog without applying (e.g. Esc, X button),
            // reset temp states to match current active filters.
            setTempSelectedCategory(selectedCategory);
            setTempFilterFunnyRate(filterFunnyRate);
            setTempShowOnlyUsed(showOnlyUsed);
          }
          setIsFilterModalOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={handleOpenFilterModal}>
              <FilterIcon className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Customize Filters</DialogTitle>
              <DialogDescription>
                Select your filter preferences below. Click apply to see the changes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Category Filter */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="modal-category-filter" className="text-right">Category</Label>
                <Select
                  value={tempSelectedCategory}
                  onValueChange={setTempSelectedCategory}
                  disabled={categories === null || categories.length === 0}
                >
                  <SelectTrigger id="modal-category-filter" className="col-span-3">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="modal-funny-rate-filter" className="text-right">Rating</Label>
                <Select
                  value={tempFilterFunnyRate.toString()}
                  onValueChange={(value) => setTempFilterFunnyRate(parseInt(value, 10))}
                >
                  <SelectTrigger id="modal-funny-rate-filter" className="col-span-3">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="modal-show-only-used" className="text-right">Usage</Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Switch
                    id="modal-show-only-used"
                    checked={tempShowOnlyUsed}
                    onCheckedChange={setTempShowOnlyUsed}
                    aria-label="Show only used jokes"
                  />
                  <Label htmlFor="modal-show-only-used" className="font-normal">Show Used Only</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFilterModalOpen(false)}>Cancel</Button>
              <Button onClick={handleApplyFilters}>Apply Filters</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Display Active Filters as Chips */}
        <div className="flex flex-wrap items-center gap-2 flex-grow min-h-[36px]"> {/* min-h to prevent layout jump */}
          {selectedCategory !== 'all' && (
            <Badge variant="secondary" className="py-1 px-2">Category: {selectedCategory}</Badge>
          )}
          {filterFunnyRate !== -1 && (
            <Badge variant="secondary" className="py-1 px-2">Rating: {getFunnyRateLabel(filterFunnyRate)}</Badge>
          )}
          {showOnlyUsed && (
            <Badge variant="secondary" className="py-1 px-2">Status: Used Only</Badge>
          )}
        </div>
        
        {(selectedCategory !== 'all' || filterFunnyRate !== -1 || showOnlyUsed) && (
            <Button variant="ghost" onClick={handleClearFilters} className="ml-auto text-sm p-2 h-auto self-center">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear All
            </Button>
        )}
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
    