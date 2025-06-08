
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
  category: z.string().trim().min(1, 'Category cannot be empty. Type a new one or select from suggestions.'),
  funnyRate: z.coerce.number().min(0).max(5).optional().default(0),
});

type EditJokeFormValues = z.infer<typeof editJokeFormSchema>;

export default function EditJokePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
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
    defaultValues: { text: '', category: '', funnyRate: 0 },
  });

  useEffect(() => {
    async function fetchJokeAndCheckOwnership() {
      if (!jokeId || !user) {
        setLoadingJokeData(false);
        if (!user && !authLoading) router.push(`/auth?redirect=/edit-joke/${jokeId}`);
        return;
      }
      setLoadingJokeData(true);
      setFetchError(null);
      try {
        const fetchedJoke = await getJokeById(jokeId);
        if (fetchedJoke) {
          if (fetchedJoke.userId !== user.uid) {
            setFetchError('You do not have permission to edit this joke.');
            toast({ title: 'Access Denied', description: 'You can only edit your own jokes.', variant: 'destructive' });
            setJoke(null);
            // router.push('/jokes'); // Redirect if not owner
          } else {
            setJoke(fetchedJoke);
            form.reset({
              text: fetchedJoke.text,
              category: fetchedJoke.category,
              funnyRate: fetchedJoke.funnyRate,
            });
            setCategorySearch(fetchedJoke.category);
          }
        } else {
           setFetchError('Joke not found.');
           toast({ title: 'Error', description: 'Joke not found.', variant: 'destructive' });
        }
      } catch (error) {
        console.error('Error fetching joke for editing:', error);
        setFetchError('Failed to load joke data.');
        toast({ title: 'Error', description: 'Failed to load joke data.', variant: 'destructive' });
      } finally {
        setLoadingJokeData(false);
      }
    }

    if (!authLoading) {
         if (!user) {
             router.push(`/auth?redirect=/edit-joke/${jokeId}`);
         } else {
            fetchJokeAndCheckOwnership();
         }
    }
  }, [jokeId, user, authLoading, getJokeById, form, router, toast]);

  const onSubmit: SubmitHandler<EditJokeFormValues> = async (data) => {
    if (!user || !joke || joke.userId !== user.uid) {
        toast({ title: 'Error', description: 'Cannot update joke. Please try again.', variant: 'destructive'});
        return;
    }

     if (data.text === joke.text && data.category === joke.category && data.funnyRate === joke.funnyRate) {
         toast({ title: 'No Changes', description: 'No changes were made to the joke.' });
         router.push('/jokes'); // Redirect to the main jokes page
         return;
     }

    setIsSubmitting(true);
    try {
      await updateJoke(joke.id, data);
      toast({ title: 'Success', description: 'Joke updated successfully!' });
      router.push('/jokes'); // Redirect to the main jokes page
    } catch (error) {
      console.error("Failed to update joke:", error);
       if (!(error instanceof Error && (error.message.includes("Category") || error.message.includes("permission denied")))) {
           toast({ title: 'Update Error', description: 'Failed to update joke.', variant: 'destructive' });
       }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = authLoading || loadingJokeData || loadingCategories || isSubmitting || !user || !!fetchError || (joke && joke.userId !== user?.uid);

  const categoryNames = useMemo(() => {
    if (!categories || !user) return [];
    // For editing, show categories created by this user.
    return Array.isArray(categories) ? categories.filter(cat => cat.userId === user.uid).map(cat => cat.name).sort() : [];
  }, [categories, user]);


   const categoryOptions = useMemo(() => {
    let filtered = categoryNames;
    if (categorySearch) {
        filtered = categoryNames.filter(name =>
            name.toLowerCase().includes(categorySearch.toLowerCase())
        );
    }
    const options = filtered.map(name => ({ value: name, label: name }));
    const searchTermTrimmed = categorySearch.trim();
    const exactMatchFound = categoryNames.some(name => name.toLowerCase() === searchTermTrimmed.toLowerCase());

    if (searchTermTrimmed && !exactMatchFound) {
      options.unshift({ value: searchTermTrimmed, label: `Create "${searchTermTrimmed}"` });
    }
    return options;
  }, [categoryNames, categorySearch]);

  if (authLoading) {
      return (
        <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2 text-muted-foreground">Verifying...</p>
        </div>
      );
  }
   if (loadingJokeData || loadingCategories) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="ml-2 text-muted-foreground">Loading data...</p>
      </div>
    );
   }

    if (fetchError) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                 <Header title="Edit Joke" />
                 <Card className="max-w-2xl mx-auto">
                    <CardHeader> <CardTitle className="text-destructive">Error</CardTitle> </CardHeader>
                    <CardContent>
                        <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive flex items-center">
                             <ShieldAlert className="mr-2 h-5 w-5 flex-shrink-0" /> <p>{fetchError}</p>
                        </div>
                        <Button variant="outline" onClick={() => router.push('/jokes')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jokes
                        </Button>
                    </CardContent>
                 </Card>
            </div>
        );
    }
    if (!joke) {
         return (
            <div className="container mx-auto p-4 md:p-8">
                 <Header title="Edit Joke" />
                 <Card className="max-w-2xl mx-auto"> <CardHeader><CardTitle>Joke Not Editable</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">This joke cannot be edited or was not found.</p>
                        <Button variant="outline" onClick={() => router.push('/jokes')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jokes
                        </Button>
                    </CardContent>
                 </Card>
            </div>
        );
    }


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
              <FormField control={form.control} name="text" render={({ field }) => (
                  <FormItem> <FormLabel>Joke Text</FormLabel> <FormControl>
                      <Textarea placeholder="Enter the joke text..." {...field} disabled={isFormDisabled} rows={5} />
                  </FormControl> <FormMessage /> </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                 <FormItem className="flex flex-col"> <FormLabel>Category</FormLabel>
                     <Popover open={isCategoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                        <FormControl>
                          <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox"
                                // aria-expanded is handled by PopoverTrigger
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                disabled={isFormDisabled || loadingCategories} >
                               <span className="truncate">
                                {loadingCategories ? "Loading..." : field.value ? categoryNames.find(name => name.toLowerCase() === field.value.toLowerCase()) || field.value : "Select or type..."}
                               </span> <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                          </PopoverTrigger>
                        </FormControl>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-60 overflow-y-auto" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput placeholder="Search or create..." value={categorySearch} onValueChange={setCategorySearch} />
                             <CommandList>
                                <CommandEmpty>{categorySearch.trim() ? `Create "${categorySearch.trim()}"?` : 'No categories.'}</CommandEmpty>
                                <CommandGroup>
                                  {categoryOptions.map((option) => (
                                    <CommandItem key={option.value} value={option.label} onSelect={() => {
                                        form.setValue('category', option.value, { shouldValidate: true });
                                        setCategorySearch(option.value); setCategoryPopoverOpen(false); }}>
                                      <Check className={cn("mr-2 h-4 w-4", field.value?.toLowerCase() === option.value.toLowerCase() ? "opacity-100" : "opacity-0")} />
                                      {option.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                             </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover> <FormMessage />
                  </FormItem>
              )} />
              <FormField control={form.control} name="funnyRate" render={({ field }) => (
                  <FormItem> <FormLabel>Funny Rate</FormLabel>
                    <FormControl>
                      <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={field.value?.toString() ?? "0"} disabled={isFormDisabled}>
                        <SelectTrigger> <SelectValue placeholder="Select a rating" /> </SelectTrigger>
                        <SelectContent> <SelectItem value="0">Unrated</SelectItem>
                          {[1, 2, 3, 4, 5].map(rate => (<SelectItem key={rate} value={rate.toString()}>{rate} Star{rate > 1 ? 's' : ''}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                 <Button type="button" variant="outline" onClick={() => router.push('/jokes')} disabled={isSubmitting}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
                 </Button>
                 <Button type="submit" disabled={isFormDisabled}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
