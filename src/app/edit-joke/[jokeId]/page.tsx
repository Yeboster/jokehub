
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, ArrowLeft, ShieldAlert, Check, ChevronsUpDown } from 'lucide-react';

import type { Joke } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useJokes } from '@/contexts/JokeContext';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input'; // Replaced with Combobox-related components
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from '@/lib/utils';

const editJokeFormSchema = z.object({
  text: z.string().min(1, 'Joke text cannot be empty.'),
  // Ensure category is trimmed and validated
  category: z.string().trim().min(1, 'Category cannot be empty. Type a new one or select from suggestions.'),
  funnyRate: z.coerce.number().min(0).max(5).optional().default(0),
});

type EditJokeFormValues = z.infer<typeof editJokeFormSchema>;

export default function EditJokePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  // Use getJokeById, updateJoke, and get categories/loading state from JokeContext
  const { getJokeById, updateJoke, categories, loadingInitialJokes: loadingCategories } = useJokes();
  const [joke, setJoke] = useState<Joke | null>(null);
  const [loadingJokeData, setLoadingJokeData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isCategoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const jokeId = Array.isArray(params.jokeId) ? params.jokeId[0] : params.jokeId;

  const form = useForm<EditJokeFormValues>({
    resolver: zodResolver(editJokeFormSchema),
    defaultValues: {
      text: '',
      category: '',
      funnyRate: 0,
    },
  });

  // Fetch joke data when component mounts or jokeId/user changes
  useEffect(() => {
    async function fetchJoke() {
      if (!jokeId || !user) {
        setLoadingJokeData(false);
        return;
      }
      setLoadingJokeData(true);
      setFetchError(null);
      try {
        const fetchedJoke = await getJokeById(jokeId);
        if (fetchedJoke) {
          setJoke(fetchedJoke);
          form.reset({ // Populate form with fetched data
            text: fetchedJoke.text,
            category: fetchedJoke.category,
            funnyRate: fetchedJoke.funnyRate,
          });
           setCategorySearch(fetchedJoke.category); // Initialize search with current category
        } else {
           setFetchError('Joke not found or you do not have permission to edit it.');
           toast({ title: 'Error', description: 'Joke not found or permission denied.', variant: 'destructive' });
        }
      } catch (error) {
        console.error('Error fetching joke for editing:', error);
        setFetchError('Failed to load joke data.');
        toast({ title: 'Error', description: 'Failed to load joke data.', variant: 'destructive' });
      } finally {
        setLoadingJokeData(false);
      }
    }

    if (!authLoading) { // Only fetch when auth state is resolved
         if (!user) {
             router.push(`/auth?redirect=/edit-joke/${jokeId}`);
         } else {
            fetchJoke();
         }
    }
  }, [jokeId, user, authLoading, getJokeById, form, router, toast]);

  const onSubmit: SubmitHandler<EditJokeFormValues> = async (data) => {
    if (!user || !joke) return;

     if (data.text === joke.text && data.category === joke.category && data.funnyRate === joke.funnyRate) {
         toast({ title: 'No Changes', description: 'No changes were made to the joke.' });
         router.push('/');
         return;
     }

    setIsSubmitting(true);
    try {
      // The category name is already trimmed by the schema validation
      await updateJoke(joke.id, data); // updateJoke handles category creation via _ensureCategoryExistsAndAdd
      toast({ title: 'Success', description: 'Joke updated successfully!' });
      router.push('/');
    } catch (error) {
      console.error("Failed to update joke:", error);
       if (!(error instanceof Error && error.message.includes("Category"))) {
           toast({ title: 'Update Error', description: 'Failed to update joke.', variant: 'destructive' });
       }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disable form if loading auth, joke data, categories, submitting, not logged in, or error occurred
  const isFormDisabled = authLoading || loadingJokeData || loadingCategories || isSubmitting || !user || !!fetchError;
  const categoryNames = useMemo(() => Array.isArray(categories) ? categories.map(cat => cat.name).sort() : [], [categories]);

   // Filtered options for Combobox, including the "Add new" option
   const categoryOptions = useMemo(() => {
    let filtered = categoryNames;
    if (categorySearch) {
        filtered = categoryNames.filter(name =>
            name.toLowerCase().includes(categorySearch.toLowerCase())
        );
    }

    const options = filtered.map(name => ({ value: name, label: name }));

    // Add "Create" option if the search term doesn't exactly match an existing category (case-insensitive)
    const searchTermTrimmed = categorySearch.trim();
    const exactMatchFound = categoryNames.some(name => name.toLowerCase() === searchTermTrimmed.toLowerCase());

    if (searchTermTrimmed && !exactMatchFound) {
      options.unshift({ value: searchTermTrimmed, label: `Create "${searchTermTrimmed}"` });
    }

    return options;
  }, [categoryNames, categorySearch]);


  // --- Loading States ---
  if (authLoading) {
      return (
        <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Verifying authentication...</p>
        </div>
      );
  }
   if (loadingJokeData) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="ml-2 text-muted-foreground">Loading joke data...</p>
      </div>
    );
  }
   // Show loading indicator while categories are loading
   if (loadingCategories) {
     return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="ml-2 text-muted-foreground">Loading categories...</p>
      </div>
     );
   }

   // --- Error State ---
    if (fetchError) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                 <Header title="Edit Joke" />
                 <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error Loading Joke</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive flex items-center">
                             <ShieldAlert className="mr-2 h-5 w-5 flex-shrink-0" />
                             <p>{fetchError}</p>
                        </div>
                        <Button variant="outline" onClick={() => router.push('/')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                        </Button>
                    </CardContent>
                 </Card>
            </div>
        );
    }

  // --- Main Form ---
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Header title="Edit Your Joke" />

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Update Joke Details</CardTitle>
          <CardDescription>Make changes to the joke text, category, or rating.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Joke Text</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter the joke text..." {...field} disabled={isFormDisabled} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                 render={({ field }) => (
                 <FormItem className="flex flex-col">
                    <FormLabel>Category</FormLabel>
                     <Popover open={isCategoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                        <PopoverTrigger asChild>
                         <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={isCategoryPopoverOpen}
                              className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                              disabled={isFormDisabled || loadingCategories}
                            >
                              {loadingCategories
                               ? "Loading categories..."
                               : field.value
                                 ? categoryNames.find(
                                     (name) => name.toLowerCase() === field.value.toLowerCase() // Case-insensitive find
                                   ) || field.value // Show typed value if not exact match
                                 : "Select or type category..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}> {/* We do custom filtering */}
                            <CommandInput
                                placeholder="Search or create category..."
                                value={categorySearch}
                                onValueChange={setCategorySearch}
                            />
                             <CommandList>
                                <CommandEmpty>
                                    {categorySearch.trim() ? `No category found. Create "${categorySearch.trim()}"?` : 'No categories found.'}
                                </CommandEmpty>
                                <CommandGroup>
                                  {categoryOptions.map((option) => (
                                    <CommandItem
                                      key={option.value} // Use value for key
                                      value={option.label} // Important: value must be unique, use label here for display/selection
                                      onSelect={() => {
                                        field.onChange(option.value); // Use the actual value (could be existing or new)
                                        setCategorySearch(option.value); // Update search to reflect selection
                                        setCategoryPopoverOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value?.toLowerCase() === option.value.toLowerCase() // Case-insensitive check
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {option.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                             </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                     <FormMessage />
                  </FormItem>
              )}
              />
              <FormField
                control={form.control}
                name="funnyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funny Rate</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value, 10))}
                      value={field.value?.toString() ?? "0"} // Ensure value is string for Select
                      disabled={isFormDisabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a rating" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Unrated</SelectItem>
                        {[1, 2, 3, 4, 5].map(rate => (
                          <SelectItem key={rate} value={rate.toString()}>{rate} Star{rate > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                 <Button type="button" variant="outline" onClick={() => router.push('/')} disabled={isSubmitting}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
                 </Button>
                 <Button type="submit" disabled={isFormDisabled}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                 </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
