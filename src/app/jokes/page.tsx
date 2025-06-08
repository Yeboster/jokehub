
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FilterParams } from '@/contexts/JokeContext';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import JokeList from '@/components/joke-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Laugh, ChevronDown, RotateCcw, Filter as FilterIcon, Check, ChevronsUpDown, XIcon, PlusCircle, Wand2, Users, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
// AddJokeForm is no longer used in this page's modal
import type { GenerateJokeOutput } from '@/ai/flows/generate-joke-flow';
import { useToast } from '@/hooks/use-toast';

export default function JokesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const {
    jokes,
    categories: allCategoriesFromContext,
    // addJoke, // No longer needed directly for modal
    loadJokesWithFilters,
    loadMoreFilteredJokes,
    hasMoreJokes,
    loadingInitialJokes,
    loadingMoreJokes
   } = useJokes();

  const [activeFilters, setActiveFilters] = useState<FilterParams>({
    scope: 'public',
    selectedCategories: [],
    filterFunnyRate: -1,
    showOnlyUsed: false,
  });

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  // Removed AddJokeModal state: const [isAddJokeModalOpen, setIsAddJokeModalOpen] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  const [tempScope, setTempScope] = useState<FilterParams['scope']>(activeFilters.scope);
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>(activeFilters.selectedCategories);
  const [tempFilterFunnyRate, setTempFilterFunnyRate] = useState<number>(activeFilters.filterFunnyRate);
  const [tempShowOnlyUsed, setTempShowOnlyUsed] = useState<boolean>(activeFilters.showOnlyUsed);
  const [categorySearch, setCategorySearch] = useState('');

  // Removed AI generation states for modal
  // const [isGeneratingJoke, setIsGeneratingJoke] = useState(false);
  // const [aiTopicHint, setAiTopicHint] = useState<string | undefined>();
  // const [aiGeneratedText, setAiGeneratedText] = useState<string | undefined>();
  // const [aiGeneratedCategory, setAiGeneratedCategory] = useState<string | undefined>();

  useEffect(() => {
    if (authLoading) return;

    let currentActiveScope = activeFilters.scope;
    if (activeFilters.scope === 'user' && !user) {
      currentActiveScope = 'public';
      setActiveFilters(prev => ({ ...prev, scope: 'public', selectedCategories: [] }));
    }
    setTempScope(currentActiveScope); 
    loadJokesWithFilters({ ...activeFilters, scope: currentActiveScope });

  }, [authLoading, user, activeFilters.scope, loadJokesWithFilters]);


  const modalCategoryNames = useMemo(() => {
    if (!allCategoriesFromContext) return [];
    if (tempScope === 'user' && user) {
      return Array.from(new Set(allCategoriesFromContext.filter(cat => cat.userId === user.uid).map(cat => cat.name))).sort();
    }
    return Array.from(new Set(allCategoriesFromContext.map(cat => cat.name))).sort();
  }, [allCategoriesFromContext, tempScope, user]);

  const activeScopeCategoryNames = useMemo(() => {
    if(!allCategoriesFromContext) return [];
    if (activeFilters.scope === 'user' && user) {
        return Array.from(new Set(allCategoriesFromContext.filter(cat => cat.userId === user.uid).map(cat => cat.name))).sort();
    }
    return Array.from(new Set(allCategoriesFromContext.map(cat => cat.name))).sort();
  }, [allCategoriesFromContext, activeFilters.scope, user]);


  const jokesToDisplay = useMemo(() => jokes ?? [], [jokes]);

  const handleOpenFilterModal = () => {
    setTempScope(activeFilters.scope);
    const validCategoriesForCurrentActiveScope = activeScopeCategoryNames;
    setTempSelectedCategories(activeFilters.selectedCategories.filter(cat => validCategoriesForCurrentActiveScope.includes(cat)));
    setTempFilterFunnyRate(activeFilters.filterFunnyRate);
    setTempShowOnlyUsed(activeFilters.showOnlyUsed);
    setCategorySearch('');
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    const validCategoriesForNewScope = modalCategoryNames; 
    const validatedSelectedCategories = tempSelectedCategories.filter(cat => validCategoriesForNewScope.includes(cat));

    const newFilters: FilterParams = {
      scope: tempScope,
      selectedCategories: validatedSelectedCategories,
      filterFunnyRate: tempFilterFunnyRate,
      showOnlyUsed: tempShowOnlyUsed,
    };
    setActiveFilters(newFilters);
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    const defaultPageFilters: FilterParams = {
      scope: 'public', 
      selectedCategories: [],
      filterFunnyRate: -1,
      showOnlyUsed: false,
    };
    
    setActiveFilters(defaultPageFilters);
    
    setTempScope('public'); 
    setTempSelectedCategories([]);
    setTempFilterFunnyRate(-1);
    setTempShowOnlyUsed(false);
    setCategorySearch('');
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

  const hasActiveAppliedFilters = activeFilters.selectedCategories.length > 0 || activeFilters.filterFunnyRate !== -1 || activeFilters.showOnlyUsed || (user && activeFilters.scope === 'user');

  // Removed AI generation related functions for modal
  // handleGenerateJokeInModal
  // handleAiJokeSubmittedFromModal
  // handleAddJokeFromFormInModal

  const pageTitle = activeFilters.scope === 'user' ? "My Joke Collection" : "All Jokes Feed";
  const pageDescription = activeFilters.scope === 'user'
    ? "Manage and filter your personal joke collection."
    : "Browse, filter, and enjoy jokes from the community. Add your own too!";

  if (authLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading joke hub...</p>
      </div>
    );
  }

  if (loadingInitialJokes || allCategoriesFromContext === null) {
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
            const validCategoriesForCurrentActiveScope = activeScopeCategoryNames;
            setTempSelectedCategories(activeFilters.selectedCategories.filter(cat => validCategoriesForCurrentActiveScope.includes(cat)));
            setTempFilterFunnyRate(activeFilters.filterFunnyRate);
            setTempShowOnlyUsed(activeFilters.showOnlyUsed);
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
                      setTempSelectedCategories([]);
                      setCategorySearch('');
                    }
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
                  {tempScope === 'user' && user ? 'My ' : ''}Categories
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
                              value={categoryName}
                              onSelect={() => {
                                toggleCategorySelectionInModal(categoryName);
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
                <Label htmlFor="modal-show-only-used" className="text-right">Usage Status</Label>
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
          {activeFilters.showOnlyUsed && (
            <Badge variant="secondary" className="py-1 px-2">Status: Used Only</Badge>
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
                    <Link href="/auth?redirect=/add-joke"> {/* Or redirect to /jokes then to /add-joke after login */}
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
