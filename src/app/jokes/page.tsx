
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import type { FilterParams } from '@/contexts/JokeContext';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import JokeList from '@/components/joke-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ChevronDown, RotateCcw, Filter as FilterIcon, Check, ChevronsUpDown, XIcon, PlusCircle, Users, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const defaultPageFilters: FilterParams = {
  scope: 'public',
  selectedCategories: [],
  filterFunnyRate: -1,
  usageStatus: 'all',
};

function JokesPageComponent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const {
    jokes,
    categories: allCategoriesFromContext, // Now contains all categories from the collection
    loadJokesWithFilters,
    loadMoreFilteredJokes,
    hasMoreJokes,
    loadingInitialJokes,
    loadingMoreJokes
   } = useJokes();

  const [activeFilters, setActiveFilters] = useState<FilterParams>(defaultPageFilters);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  const [tempScope, setTempScope] = useState<FilterParams['scope']>(defaultPageFilters.scope);
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>(defaultPageFilters.selectedCategories);
  const [tempFilterFunnyRate, setTempFilterFunnyRate] = useState<number>(defaultPageFilters.filterFunnyRate);
  const [tempUsageStatus, setTempUsageStatus] = useState<FilterParams['usageStatus']>(defaultPageFilters.usageStatus);
  const [categorySearch, setCategorySearch] = useState('');

  useEffect(() => {
    if (authLoading) return;

    const queryScope = searchParams.get('scope') as FilterParams['scope'] || defaultPageFilters.scope;
    const queryCategoriesRaw = searchParams.get('categories');
    const queryCategories = queryCategoriesRaw ? queryCategoriesRaw.split(',').filter(c => c.trim() !== '') : defaultPageFilters.selectedCategories;
    
    const queryFunnyRateRaw = searchParams.get('funnyRate');
    let parsedFunnyRate = defaultPageFilters.filterFunnyRate;
    if (queryFunnyRateRaw !== null) {
        const tempRate = parseInt(queryFunnyRateRaw, 10);
        if (!isNaN(tempRate) && tempRate >= -1 && tempRate <= 5) {
            parsedFunnyRate = tempRate;
        }
    }

    const queryUsageStatus = searchParams.get('usageStatus') as FilterParams['usageStatus'] || defaultPageFilters.usageStatus;

    let effectiveScope = queryScope;
    if (queryScope === 'user' && !user) {
        effectiveScope = 'public'; 
    }
    
    const filtersFromUrl: FilterParams = {
      scope: effectiveScope,
      selectedCategories: queryCategories,
      filterFunnyRate: parsedFunnyRate,
      usageStatus: ['all', 'used', 'unused'].includes(queryUsageStatus) ? queryUsageStatus : defaultPageFilters.usageStatus,
    };
    
    setActiveFilters(prevFilters => {
      if (JSON.stringify(prevFilters) === JSON.stringify(filtersFromUrl)) {
        return prevFilters;
      }
      return filtersFromUrl;
    });

    setTempScope(filtersFromUrl.scope);
    setTempSelectedCategories([...filtersFromUrl.selectedCategories]);
    setTempFilterFunnyRate(filtersFromUrl.filterFunnyRate);
    setTempUsageStatus(filtersFromUrl.usageStatus);

  }, [searchParams, user, authLoading]);

  useEffect(() => {
    if (authLoading) {
      return; 
    }
    loadJokesWithFilters(activeFilters);

  }, [user, authLoading, activeFilters, loadJokesWithFilters]);

  // modalCategoryNames now represents all unique category names from the system
  const modalCategoryNames = useMemo(() => {
    if (!allCategoriesFromContext) return [];
    // Get unique names from all categories fetched by the context
    const distinctNames = Array.from(new Set(allCategoriesFromContext.map(cat => cat.name)));
    return distinctNames.sort();
  }, [allCategoriesFromContext]);


  const jokesToDisplay = useMemo(() => jokes ?? [], [jokes]);

  const handleOpenFilterModal = () => {
    setCategorySearch('');
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    // Validate selected categories against the available modalCategoryNames
    // (though modalCategoryNames is now global, this ensures consistency if it were to change)
    const validatedSelectedCategories = tempSelectedCategories.filter(cat => modalCategoryNames.includes(cat));

    const newFilters: FilterParams = {
      scope: tempScope,
      selectedCategories: validatedSelectedCategories,
      filterFunnyRate: tempFilterFunnyRate,
      usageStatus: tempUsageStatus,
    };

    const queryParams = new URLSearchParams();
    if (newFilters.scope !== defaultPageFilters.scope) {
      queryParams.set('scope', newFilters.scope);
    }
    if (newFilters.selectedCategories.length > 0) {
      queryParams.set('categories', newFilters.selectedCategories.join(','));
    }
    if (newFilters.filterFunnyRate !== defaultPageFilters.filterFunnyRate) {
      queryParams.set('funnyRate', newFilters.filterFunnyRate.toString());
    }
    if (newFilters.usageStatus !== defaultPageFilters.usageStatus) {
      queryParams.set('usageStatus', newFilters.usageStatus);
    }
    
    const queryString = queryParams.toString();
    router.push(queryString ? `/jokes?${queryString}` : '/jokes');
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    setCategorySearch('');
    router.push('/jokes');
  };


  const getFunnyRateLabel = (rate: number): string => {
    if (rate === 0) return "Unrated";
    if (rate === -1) return "Any Rating";
    return `${rate} Star${rate > 1 ? 's' : ''}`;
  };

  const toggleCategorySelectionInModal = (categoryName: string) => {
    setTempSelectedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const filteredCategoryOptionsForModal = useMemo(() => {
    if (!modalCategoryNames) return [];
    if (!categorySearch) return modalCategoryNames;
    return modalCategoryNames.filter(name =>
      name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [modalCategoryNames, categorySearch]);

  const hasActiveAppliedFilters = useMemo(() => 
    activeFilters.scope !== defaultPageFilters.scope ||
    activeFilters.selectedCategories.length > 0 || 
    activeFilters.filterFunnyRate !== defaultPageFilters.filterFunnyRate || 
    activeFilters.usageStatus !== defaultPageFilters.usageStatus,
  [activeFilters]);

  const pageTitle = activeFilters.scope === 'user' && user ? "My Joke Collection" : "All Jokes Feed";
  const pageDescription = activeFilters.scope === 'user' && user
    ? "Manage and filter your personal joke collection."
    : "Browse, filter, and enjoy jokes from the community. Add your own too!";

  if (authLoading || (loadingInitialJokes && jokes === null) || allCategoriesFromContext === null) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading jokes and categories...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">{pageTitle}</h1>
        <p className="mt-3 text-lg text-muted-foreground sm:text-xl">
          {pageDescription}
        </p>
      </header>

      <div className="mb-6 p-4 flex items-center gap-x-4 gap-y-3 border-b pb-6">
        <Dialog open={isFilterModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { 
            setTempScope(activeFilters.scope);
            setTempSelectedCategories([...activeFilters.selectedCategories]);
            setTempFilterFunnyRate(activeFilters.filterFunnyRate);
            setTempUsageStatus(activeFilters.usageStatus);
            setCategorySearch('');
          }
          setIsFilterModalOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={handleOpenFilterModal} className="h-9">
              <FilterIcon className="mr-2 h-4 w-4" />
              Filters
              {hasActiveAppliedFilters && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Filter Jokes</DialogTitle>
              <DialogDescription>
                Select preferences to filter the joke feed.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(80vh-200px)] md:max-h-[calc(70vh-150px)]">
            <div className="grid gap-6 py-4 pr-3">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="filter-scope-select" className="text-right">
                  Show Jokes
                </Label>
                <Select
                  value={tempScope}
                  onValueChange={(value: FilterParams['scope']) => {
                    if (value === 'user' && !user) {
                      toast({ title: 'Login Required', description: 'Log in to see your jokes.', variant: 'destructive'});
                      setTempScope('public'); 
                    } else {
                      setTempScope(value);
                    }
                    // If scope changes, selected categories might need validation or reset if categories were scope-dependent.
                    // Since categories are now global for the filter, no reset needed here based on scope change.
                  }}
                  disabled={authLoading}
                >
                  <SelectTrigger id="filter-scope-select" className="col-span-3 text-sm">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public" className="text-sm">
                      <div className="flex items-center gap-2"> <Users className="h-4 w-4"/> All Jokes</div>
                    </SelectItem>
                    <SelectItem value="user" disabled={!user || authLoading} className="text-sm">
                       <div className="flex items-center gap-2"> <User className="h-4 w-4"/> My Jokes</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="modal-category-filter" className="text-right pt-2">
                  Categories
                </Label>
                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                  <PopoverTrigger asChild className="col-span-3">
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isCategoryPopoverOpen}
                      className="w-full justify-between text-left font-normal h-auto min-h-10"
                       disabled={modalCategoryNames === null || modalCategoryNames.length === 0}
                    >
                      <div className="flex flex-wrap gap-1">
                        {tempSelectedCategories.length === 0 && <span className="text-muted-foreground">Select categories...</span>}
                        {tempSelectedCategories.map(cat => (
                          <Badge key={cat} variant="secondary" className="py-0.5 px-1.5">
                            {cat}
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={`Remove category ${cat}`}
                              className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-1 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); toggleCategorySelectionInModal(cat);}}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleCategorySelectionInModal(cat);
                                }
                              }}
                            >
                              <XIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </span>
                          </Badge>
                        ))}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-60 overflow-y-auto" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search categories..."
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>{modalCategoryNames.length === 0 ? "No categories available." : "No categories found."}</CommandEmpty>
                        <CommandGroup>
                          {filteredCategoryOptionsForModal.map((categoryName) => (
                            <CommandItem
                              key={categoryName}
                              value={categoryName} // Value for CMDK filtering/selection
                              onSelect={() => { // onSelect uses the value (categoryName)
                                toggleCategorySelectionInModal(categoryName);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  tempSelectedCategories.includes(categoryName) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {categoryName} {/* Display label */}
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
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Usage Status</Label>
                <RadioGroup
                  value={tempUsageStatus}
                  onValueChange={(value: FilterParams['usageStatus']) => setTempUsageStatus(value)}
                  className="col-span-3 space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="usage-all" />
                    <Label htmlFor="usage-all" className="font-normal">Show All</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="used" id="usage-used" />
                    <Label htmlFor="usage-used" className="font-normal">Only Used</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unused" id="usage-unused" />
                    <Label htmlFor="usage-unused" className="font-normal">Only Unused</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
              <Button variant="outline" onClick={() => setIsFilterModalOpen(false)}>Cancel</Button>
              <Button onClick={handleApplyFilters}>Apply Filters</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex flex-wrap items-center gap-2 flex-grow min-h-[36px]">
          {activeFilters.scope === 'user' && user && (
            <Badge variant="secondary" className="py-1 px-2 bg-primary/10 text-primary border-primary/30">Showing: My Jokes</Badge>
          )}
          {activeFilters.selectedCategories.map(category => (
             <Badge key={category} variant="secondary" className="py-1 px-2">Category: {category}</Badge>
          ))}
          {activeFilters.filterFunnyRate !== -1 && (
            <Badge variant="secondary" className="py-1 px-2">Rating: {getFunnyRateLabel(activeFilters.filterFunnyRate)}</Badge>
          )}
          {activeFilters.usageStatus === 'used' && (
            <Badge variant="secondary" className="py-1 px-2">Status: Used</Badge>
          )}
          {activeFilters.usageStatus === 'unused' && (
            <Badge variant="secondary" className="py-1 px-2">Status: Unused</Badge>
          )}
        </div>

        <div className="flex items-center ml-auto">
            {user ? (
                <Button variant="default" size="sm" className="h-9" asChild>
                    <Link href="/add-joke">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Joke
                    </Link>
                </Button>
            ) : (
                <Button variant="default" size="sm" asChild className="h-9">
                    <Link href="/auth?redirect=/add-joke">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Log in to Add Jokes
                    </Link>
                </Button>
            )}

            {hasActiveAppliedFilters && (
                <Button variant="ghost" onClick={handleClearFilters} className="ml-2 text-sm p-2 h-auto self-center">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear All
                </Button>
            )}
        </div>
      </div>

      <JokeList jokes={jokesToDisplay} />

      <div className="mt-8 text-center">
        {hasMoreJokes ? (
          <Button
            onClick={loadMoreFilteredJokes}
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
          jokesToDisplay.length > 0 && !loadingInitialJokes && <p className="text-muted-foreground">No more jokes to load for the current filters.</p>
        )}
      </div>
    </div>
  );
}

export default function JokesPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading page...</p>
      </div>
    }>
      <JokesPageComponent />
    </Suspense>
  );
}
