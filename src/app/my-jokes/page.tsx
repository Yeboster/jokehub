
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FilterParams } from '@/contexts/JokeContext'; 
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import JokeList from '@/components/joke-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Laugh, ChevronDown, RotateCcw, Filter as FilterIcon, Check, ChevronsUpDown, XIcon, PlusCircle, Wand2, ShieldAlert } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import AddJokeForm, { type JokeFormValues } from '@/components/add-joke-form';
import type { GenerateJokeOutput } from '@/ai/flows/generate-joke-flow';
import { useToast } from '@/hooks/use-toast';

export default function MyJokesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const {
    jokes,
    categories,
    addJoke, 
    loadJokesWithFilters,
    loadMoreFilteredJokes,
    hasMoreJokes,
    loadingInitialJokes,
    loadingMoreJokes
   } = useJokes();

  const [activeFilters, setActiveFilters] = useState<Omit<FilterParams, 'scope'>>({
    selectedCategories: [],
    filterFunnyRate: -1,
    showOnlyUsed: false,
  });

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAddJokeModalOpen, setIsAddJokeModalOpen] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>(activeFilters.selectedCategories);
  const [tempFilterFunnyRate, setTempFilterFunnyRate] = useState<number>(activeFilters.filterFunnyRate);
  const [tempShowOnlyUsed, setTempShowOnlyUsed] = useState<boolean>(activeFilters.showOnlyUsed);
  const [categorySearch, setCategorySearch] = useState('');

  const [isGeneratingJoke, setIsGeneratingJoke] = useState(false);
  const [aiTopicHint, setAiTopicHint] = useState<string | undefined>();
  const [aiGeneratedText, setAiGeneratedText] = useState<string | undefined>();
  const [aiGeneratedCategory, setAiGeneratedCategory] = useState<string | undefined>();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/my-jokes');
    }
  }, [user, authLoading, router]);

  // Load user's jokes on initial mount (if user is available) and when filters change
  useEffect(() => {
    if (user) {
      loadJokesWithFilters({ ...activeFilters, scope: 'user' });
    }
  }, [loadJokesWithFilters, activeFilters, user]);

  const categoryNames = useMemo(() => {
    if (!categories || !user) return [];
    // For "My Jokes", filter categories to show only those created by the current user,
    // or all categories if the user might be referencing a globally created one (depends on desired UX).
    // For simplicity here, we show all categories they might have used or created.
    // The AddJokeForm ensures new categories are user-scoped.
    return Array.from(new Set(categories.filter(cat => cat.userId === user.uid).map(cat => cat.name))).sort();
  }, [categories, user]);

  const jokesToDisplay = useMemo(() => jokes ?? [], [jokes]);

  const handleOpenFilterModal = () => {
    setTempSelectedCategories([...activeFilters.selectedCategories]);
    setTempFilterFunnyRate(activeFilters.filterFunnyRate);
    setTempShowOnlyUsed(activeFilters.showOnlyUsed);
    setCategorySearch(''); 
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    const newFilters: Omit<FilterParams, 'scope'> = {
      selectedCategories: [...tempSelectedCategories],
      filterFunnyRate: tempFilterFunnyRate,
      showOnlyUsed: tempShowOnlyUsed,
    };
    setActiveFilters(newFilters);
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    const defaultPageFilters: Omit<FilterParams, 'scope'> = {
      selectedCategories: [],
      filterFunnyRate: -1,
      showOnlyUsed: false,
    };
    setActiveFilters(defaultPageFilters);
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

  const handleGenerateJokeInModal = async () => {
    if (!user) return; // Should be caught by page guard, but good practice
    setIsGeneratingJoke(true);
    try {
      const trimmedTopicHint = aiTopicHint?.trim();
      const response = await fetch('/api/generate-joke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicHint: trimmedTopicHint, prefilledJoke: aiGeneratedText }),
      });
      if (!response.ok) {
        let errorData; try { errorData = await response.json(); } catch (e) { /* ignore */ }
        throw new Error(errorData?.error || `API request failed`);
      }
      const result: GenerateJokeOutput = await response.json();
      setAiGeneratedText(result.jokeText);
      setAiGeneratedCategory(result.category ? result.category.trim() : ''); 
      toast({ title: 'Joke Generated!', description: 'Pre-filled in the form.' });
    } catch (error: any) {
      toast({ title: 'AI Error', description: error.message || 'Failed to generate.', variant: 'destructive' });
    } finally {
      setIsGeneratingJoke(false);
    }
  };

  const handleAiJokeSubmittedFromModal = () => {
    setAiGeneratedText(undefined);
    setAiGeneratedCategory(undefined);
  };

  const handleAddJokeFromFormInModal = async (data: JokeFormValues) => {
    await addJoke(data); 
    setIsAddJokeModalOpen(false); 
  };

  if (authLoading || !user) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  if (loadingInitialJokes || categories === null) { 
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading your jokes...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">My Jokes</h1>
        <p className="mt-3 text-lg text-muted-foreground sm:text-xl">Manage and filter your personal joke collection.</p>
      </header>

      <div className="mb-4 p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Dialog open={isFilterModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { /* Reset temps if modal closed without applying */ }
          setIsFilterModalOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={handleOpenFilterModal}>
              <FilterIcon className="mr-2 h-4 w-4" />
              Filter My Jokes
              {hasActiveAppliedFilters && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Filter Your Jokes</DialogTitle>
              <DialogDescription>
                Select preferences to filter your personal joke collection.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="my-jokes-category-filter" className="text-right pt-2">My Categories</Label>
                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                  <PopoverTrigger asChild className="col-span-3">
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isCategoryPopoverOpen}
                      className="w-full justify-between text-left font-normal h-auto min-h-10"
                       disabled={categoryNames === null || categoryNames.length === 0}
                    >
                      <div className="flex flex-wrap gap-1">
                        {tempSelectedCategories.length === 0 && <span className="text-muted-foreground">Select categories...</span>}
                        {tempSelectedCategories.map(cat => (
                          <Badge key={cat} variant="secondary" className="py-0.5 px-1.5">
                            {cat}
                            <button type="button" className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-1"
                              onClick={(e) => { e.stopPropagation(); toggleCategorySelection(cat);}}>
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
                        placeholder="Search my categories..."
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                      />
                      <CommandList>
                        <CommandEmpty>{categoryNames.length === 0 ? "No categories found." : "No matching categories."}</CommandEmpty>
                        <CommandGroup>
                          {filteredCategoryOptions.map((categoryName) => (
                            <CommandItem key={categoryName} value={categoryName} onSelect={() => toggleCategorySelection(categoryName)}>
                              <Check className={cn("mr-2 h-4 w-4", tempSelectedCategories.includes(categoryName) ? "opacity-100" : "opacity-0")} />
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
                <Label htmlFor="my-jokes-funny-rate-filter" className="text-right">Rating</Label>
                <Select value={tempFilterFunnyRate.toString()} onValueChange={(value) => setTempFilterFunnyRate(parseInt(value, 10))}>
                  <SelectTrigger id="my-jokes-funny-rate-filter" className="col-span-3">
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">Any Rating</SelectItem>
                    <SelectItem value="0">Unrated</SelectItem>
                    {[1, 2, 3, 4, 5].map(rate => (<SelectItem key={rate} value={rate.toString()}>{rate} Star{rate > 1 ? 's' : ''}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="my-jokes-show-only-used" className="text-right">Usage</Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Switch id="my-jokes-show-only-used" checked={tempShowOnlyUsed} onCheckedChange={setTempShowOnlyUsed} aria-label="Show only used jokes" />
                  <Label htmlFor="my-jokes-show-only-used" className="font-normal">Show Used Only</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFilterModalOpen(false)}>Cancel</Button>
              <Button onClick={handleApplyFilters}>Apply Filters</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddJokeModalOpen} onOpenChange={setIsAddJokeModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Joke
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader> <DialogTitle>Add a New Joke</DialogTitle> <DialogDescription>Create a joke manually or use AI.</DialogDescription> </DialogHeader>
            <ScrollArea className="max-h-[calc(80vh-120px)] md:max-h-[70vh] pr-3">
              <div className="py-2 space-y-3">
                <div className="space-y-2 p-3 border rounded-md shadow-sm bg-muted/30">
                  <h3 className="text-sm font-semibold flex items-center"><Wand2 className="mr-2 h-4 w-4 text-primary" />Generate with AI</h3>
                  <div>
                    <Label htmlFor="ai-topic-hint-my-jokes" className="text-xs">Topic Hint (Optional)</Label>
                    <Input id="ai-topic-hint-my-jokes" type="text" placeholder="e.g., animals, space" value={aiTopicHint || ''} onChange={(e) => setAiTopicHint(e.target.value)} disabled={isGeneratingJoke} className="mt-1 h-9 text-sm" />
                  </div>
                  <Button onClick={handleGenerateJokeInModal} disabled={isGeneratingJoke} className="w-full" size="sm">
                    {isGeneratingJoke ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {isGeneratingJoke ? 'Generating...' : (aiGeneratedText ? 'Generate Another' : 'Generate Joke')}
                  </Button>
                  {aiGeneratedText && (<p className="text-xs text-muted-foreground pt-1">Tip: Generate again for a new one.</p>)}
                </div>
                <AddJokeForm onAddJoke={handleAddJokeFromFormInModal} aiGeneratedText={aiGeneratedText} aiGeneratedCategory={aiGeneratedCategory} onAiJokeSubmitted={handleAiJokeSubmittedFromModal} />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <div className="flex flex-wrap items-center gap-2 flex-grow min-h-[36px]">
          {activeFilters.selectedCategories.map(category => (<Badge key={category} variant="secondary" className="py-1 px-2">Category: {category}</Badge>))}
          {activeFilters.filterFunnyRate !== -1 && (<Badge variant="secondary" className="py-1 px-2">Rating: {getFunnyRateLabel(activeFilters.filterFunnyRate)}</Badge>)}
          {activeFilters.showOnlyUsed && (<Badge variant="secondary" className="py-1 px-2">Status: Used Only</Badge>)}
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
          <Button onClick={loadMoreFilteredJokes} disabled={loadingMoreJokes} variant="outline" size="lg">
            {loadingMoreJokes ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ChevronDown className="mr-2 h-5 w-5" />}
            {loadingMoreJokes ? 'Loading...' : 'Load More Jokes'}
          </Button>
        ) : (
          jokesToDisplay.length > 0 && !loadingInitialJokes && <p className="text-muted-foreground">No more of your jokes to load.</p>
        )}
      </div>
    </div>
  );
}
