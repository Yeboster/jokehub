
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { FilterParams } from '@/contexts/JokeContext'; // Import FilterParams type
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import JokeList from '@/components/joke-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Laugh, ChevronDown, RotateCcw, Filter as FilterIcon, Check, ChevronsUpDown, XIcon, PlusCircle, Wand2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { cn } from '@/lib/utils';
import AddJokeForm, { type JokeFormValues } from '@/components/add-joke-form';
import { generateJoke, type GenerateJokeOutput } from '@/ai/flows/generate-joke-flow';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const {
    jokes,
    categories,
    addJoke, // For the AddJokeForm
    loadJokesWithFilters,
    loadMoreFilteredJokes,
    hasMoreJokes,
    loadingInitialJokes,
    loadingMoreJokes
   } = useJokes();

  const [activeFilters, setActiveFilters] = useState<FilterParams>({
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

  // State for AI Joke Generation within the modal
  const [isGeneratingJoke, setIsGeneratingJoke] = useState(false);
  const [aiTopicHint, setAiTopicHint] = useState<string | undefined>();
  const [aiGeneratedText, setAiGeneratedText] = useState<string | undefined>();
  const [aiGeneratedCategory, setAiGeneratedCategory] = useState<string | undefined>();


  useEffect(() => {
    setTempSelectedCategories([...activeFilters.selectedCategories]);
    setTempFilterFunnyRate(activeFilters.filterFunnyRate);
    setTempShowOnlyUsed(activeFilters.showOnlyUsed);
  }, [activeFilters]);


  const categoryNames = useMemo(() => {
    if (!categories) return [];
    return categories.map(cat => cat.name).sort();
  }, [categories]);

  const jokesToDisplay = useMemo(() => jokes ?? [], [jokes]);


  const handleOpenFilterModal = () => {
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
    setActiveFilters(newFilters);
    loadJokesWithFilters(newFilters);
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    const defaultFilters: FilterParams = {
      selectedCategories: [],
      filterFunnyRate: -1,
      showOnlyUsed: false,
    };
    setActiveFilters(defaultFilters);
    setTempSelectedCategories([]);
    setTempFilterFunnyRate(-1);
    setTempShowOnlyUsed(false);
    setCategorySearch('');
    loadJokesWithFilters(defaultFilters);
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

  // --- AI Joke Generation Logic (moved from manage page) ---
  const handleGenerateJokeInModal = async () => {
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to generate jokes.', variant: 'destructive' });
      return;
    }
    setIsGeneratingJoke(true);
    try {
      const trimmedTopicHint = aiTopicHint?.trim();
      const result: GenerateJokeOutput = await generateJoke({ topicHint: trimmedTopicHint, prefilledJoke: aiGeneratedText });
      
      setAiGeneratedText(result.jokeText);
      setAiGeneratedCategory(result.category ? result.category.trim() : ''); 

      toast({ title: 'Joke Generated!', description: 'The joke has been pre-filled in the form below.' });
    } catch (error: any) {
      console.error("Error generating joke:", error);
      toast({ title: 'AI Error', description: error.message || 'Failed to generate joke.', variant: 'destructive' });
    } finally {
      setIsGeneratingJoke(false);
    }
  };

  const handleAiJokeSubmittedFromModal = () => {
    setAiGeneratedText(undefined);
    setAiGeneratedCategory(undefined);
    // setAiTopicHint(''); // Optionally clear topic hint
  };

  const handleAddJokeFromFormInModal = async (data: JokeFormValues) => {
    await addJoke(data); // Call context's addJoke
    // AddJokeForm's internal onSubmit will call its onAiJokeSubmitted prop if it was an AI joke.
    // This might trigger handleAiJokeSubmittedFromModal if wired up correctly.
    // After successful submission, close the modal.
    setIsAddJokeModalOpen(false); 
  };


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
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">Jokes</h1>
        <p className="mt-3 text-lg text-muted-foreground sm:text-xl">Get ready to laugh</p>
      </header>

      <div className="mb-4 p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Filter Button */}
        <Dialog open={isFilterModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) { 
            setTempSelectedCategories([...activeFilters.selectedCategories]);
            setTempFilterFunnyRate(activeFilters.filterFunnyRate);
            setTempShowOnlyUsed(activeFilters.showOnlyUsed);
          }
          setIsFilterModalOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={handleOpenFilterModal}>
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

        {/* Add New Joke Button & Modal */}
        <Dialog open={isAddJokeModalOpen} onOpenChange={setIsAddJokeModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Joke
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add a New Joke</DialogTitle>
              <DialogDescription>
                Create a joke manually or let AI generate one for you.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(80vh-120px)] md:max-h-[70vh] pr-3">
              <div className="py-2 space-y-3"> {/* Optimized: Reduced py and space-y */}
                {/* AI Joke Generation Section */}
                <div className="space-y-2 p-3 border rounded-md shadow-sm bg-muted/30"> {/* Optimized: Reduced space-y and p */}
                  <h3 className="text-sm font-semibold flex items-center"> {/* Optimized: text-sm */}
                    <Wand2 className="mr-2 h-4 w-4 text-primary" /> {/* Optimized: h-4 w-4 */}
                    Generate with AI
                  </h3>
                  <div>
                    <Label htmlFor="ai-topic-hint-modal" className="text-xs">Topic Hint (Optional)</Label> {/* Optimized: text-xs */}
                    <Input 
                        id="ai-topic-hint-modal"
                        type="text"
                        placeholder="e.g., animals, space, food"
                        value={aiTopicHint || ''}
                        onChange={(e) => setAiTopicHint(e.target.value)}
                        disabled={isGeneratingJoke || !user}
                        className="mt-1 h-9 text-sm" // Optimized: h-9, text-sm
                    />
                  </div>
                  <Button 
                      onClick={handleGenerateJokeInModal} 
                      disabled={isGeneratingJoke || !user} 
                      className="w-full"
                      size="sm"
                  >
                    {isGeneratingJoke ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    {isGeneratingJoke ? 'Generating...' : (aiGeneratedText ? 'Generate Another' : 'Generate Joke')}
                  </Button>
                   {aiGeneratedText && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Tip: Click generate again to get a new one. The current generated text will be used to encourage variety.
                    </p>
                  )}
                </div>

                {/* AddJokeForm */}
                <AddJokeForm 
                    onAddJoke={handleAddJokeFromFormInModal} 
                    aiGeneratedText={aiGeneratedText}
                    aiGeneratedCategory={aiGeneratedCategory}
                    onAiJokeSubmitted={handleAiJokeSubmittedFromModal}
                />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Active Filter Chips */}
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
    

    



    