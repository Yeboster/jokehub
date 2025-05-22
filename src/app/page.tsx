
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { FilterParams } from '@/contexts/JokeContext'; // Import FilterParams type
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
// import Header from '@/components/header'; // No longer using generic header here
import JokeList from '@/components/joke-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Laugh, ChevronDown, RotateCcw, Filter as FilterIcon, Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const {
    jokes,
    categories,
    loadJokesWithFilters, // Use new function for applying filters
    loadMoreFilteredJokes,  // Use new function for loading more
    hasMoreJokes,
    loadingInitialJokes,
    loadingMoreJokes
   } = useJokes();

  // These states now represent the *active* filters applied to the list
  const [activeFilters, setActiveFilters] = useState<FilterParams>({
    selectedCategories: [],
    filterFunnyRate: -1,
    showOnlyUsed: false,
  });

  // State for filter modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  // Temporary states for modal selections, initialized from activeFilters
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>(activeFilters.selectedCategories);
  const [tempFilterFunnyRate, setTempFilterFunnyRate] = useState<number>(activeFilters.filterFunnyRate);
  const [tempShowOnlyUsed, setTempShowOnlyUsed] = useState<boolean>(activeFilters.showOnlyUsed);
  const [categorySearch, setCategorySearch] = useState('');

  useEffect(() => {
    // When activeFilters change (e.g. on apply or clear), re-initialize temp states for the modal
    // This ensures the modal opens with the currently active filters
    setTempSelectedCategories([...activeFilters.selectedCategories]);
    setTempFilterFunnyRate(activeFilters.filterFunnyRate);
    setTempShowOnlyUsed(activeFilters.showOnlyUsed);
  }, [activeFilters]);


  const categoryNames = useMemo(() => {
    if (!categories) return [];
    return categories.map(cat => cat.name).sort();
  }, [categories]);

  // The `filteredJokes` logic is now primarily handled by JokeContext fetching.
  // This useMemo simply returns the jokes received from the context.
  // The context itself ensures these jokes are already filtered.
  const jokesToDisplay = useMemo(() => jokes ?? [], [jokes]);


  const handleOpenFilterModal = () => {
    // Initialize temporary states with current active filters from `activeFilters` state
    setTempSelectedCategories([...activeFilters.selectedCategories]);
    setTempFilterFunnyRate(activeFilters.filterFunnyRate);
    setTempShowOnlyUsed(activeFilters.showOnlyUsed);
    setCategorySearch(''); 
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    const newFilters: FilterParams = {
      selectedCategories: [...tempSelectedCategories],
      filterFunnyRate: tempFilterFunnyRate,
      showOnlyUsed: tempShowOnlyUsed,
    };
    setActiveFilters(newFilters); // Update active filters state
    loadJokesWithFilters(newFilters); // Tell context to fetch with these filters
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    const defaultFilters: FilterParams = {
      selectedCategories: [],
      filterFunnyRate: -1,
      showOnlyUsed: false,
    };
    setActiveFilters(defaultFilters); // Reset active filters state
    setTempSelectedCategories([]); // Reset temp modal states as well
    setTempFilterFunnyRate(-1);
    setTempShowOnlyUsed(false);
    setCategorySearch('');
    loadJokesWithFilters(defaultFilters); // Tell context to fetch with default filters
    // Modal will close automatically if open due to onOpenChange, or remain closed
  };
  
  const getFunnyRateLabel = (rate: number): string => {
    if (rate === 0) return "Unrated";
    if (rate === -1) return "Any Rating"; 
    return `${rate} Star${rate > 1 ? 's' : ''}`;
  };

  const toggleCategorySelection = (categoryName: string) => {
    setTempSelectedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };
  
  const filteredCategoryOptions = useMemo(() => {
    if (!categoryNames) return [];
    if (!categorySearch) return categoryNames;
    return categoryNames.filter(name => 
      name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categoryNames, categorySearch]);

  const hasActiveAppliedFilters = activeFilters.selectedCategories.length > 0 || activeFilters.filterFunnyRate !== -1 || activeFilters.showOnlyUsed;

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Checking authentication...</p>
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

  if (loadingInitialJokes || categories === null || jokes === null) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading your jokes...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center"> {/* Hero Title Section */}
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">Jokes</h1>
        <p className="mt-3 text-lg text-muted-foreground sm:text-xl">Get ready to laugh</p>
      </header>

      <div className="mb-6 p-4 flex flex-wrap items-center gap-x-4 gap-y-2"> {/* Removed border-b */}
        <Dialog open={isFilterModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { 
            // If modal is closed without applying, revert temp states to active filters
            setTempSelectedCategories([...activeFilters.selectedCategories]);
            setTempFilterFunnyRate(activeFilters.filterFunnyRate);
            setTempShowOnlyUsed(activeFilters.showOnlyUsed);
          }
          setIsFilterModalOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={handleOpenFilterModal}> {/* Made button smaller */}
              <FilterIcon className="mr-2 h-4 w-4" />
              Filters
              {hasActiveAppliedFilters && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Customize Filters</DialogTitle>
              <DialogDescription>
                Select your filter preferences below. Click apply to see the changes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="modal-category-filter" className="text-right pt-2">Categories</Label>
                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                  <PopoverTrigger asChild className="col-span-3">
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isCategoryPopoverOpen}
                      className="w-full justify-between text-left font-normal h-auto min-h-10"
                       disabled={categories === null || categories.length === 0}
                    >
                      <div className="flex flex-wrap gap-1">
                        {tempSelectedCategories.length === 0 && <span className="text-muted-foreground">Select categories...</span>}
                        {tempSelectedCategories.map(cat => (
                          <Badge key={cat} variant="secondary" className="py-0.5 px-1.5">
                            {cat}
                            <button
                              type="button"
                              className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-1"
                              onClick={(e) => { e.stopPropagation(); toggleCategorySelection(cat);}}
                            >
                              <XIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search categories..."
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                      />
                      <CommandList>
                        <CommandEmpty>No categories found.</CommandEmpty>
                        <CommandGroup>
                          {filteredCategoryOptions.map((categoryName) => (
                            <CommandItem
                              key={categoryName}
                              value={categoryName}
                              onSelect={() => {
                                toggleCategorySelection(categoryName);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  tempSelectedCategories.includes(categoryName) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {categoryName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

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

        <div className="flex flex-wrap items-center gap-2 flex-grow min-h-[36px]">
          {activeFilters.selectedCategories.map(category => (
             <Badge key={category} variant="secondary" className="py-1 px-2">Category: {category}</Badge>
          ))}
          {activeFilters.filterFunnyRate !== -1 && (
            <Badge variant="secondary" className="py-1 px-2">Rating: {getFunnyRateLabel(activeFilters.filterFunnyRate)}</Badge>
          )}
          {activeFilters.showOnlyUsed && (
            <Badge variant="secondary" className="py-1 px-2">Status: Used Only</Badge>
          )}
        </div>
        
        {hasActiveAppliedFilters && (
            <Button variant="ghost" onClick={handleClearFilters} className="ml-auto text-sm p-2 h-auto self-center">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear All
            </Button>
        )}
      </div>

      <JokeList jokes={jokesToDisplay} />

      <div className="mt-8 text-center">
        {hasMoreJokes ? (
          <Button
            onClick={loadMoreFilteredJokes} // Use the new context function
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
          // Message if jokes are present but no more to load
          jokesToDisplay.length > 0 && !loadingInitialJokes && <p className="text-muted-foreground">No more jokes to load for the current filters.</p>
        )}
      </div>
    </div>
  );
}
    
