
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, ArrowLeft, ShieldAlert } from 'lucide-react';

import type { Joke } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useJokes } from '@/contexts/JokeContext';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const editJokeFormSchema = z.object({
  text: z.string().min(1, 'Joke text cannot be empty.'),
  category: z.string().min(1, 'Category cannot be empty. Type a new one or select from suggestions.').trim(),
  funnyRate: z.coerce.number().min(0).max(5).optional().default(0),
});

type EditJokeFormValues = z.infer<typeof editJokeFormSchema>;

export default function EditJokePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { getJokeById, updateJoke, categories, loadingInitialJokes: loadingCategories } = useJokes(); // Use getJokeById and updateJoke
  const [joke, setJoke] = useState<Joke | null>(null);
  const [loadingJokeData, setLoadingJokeData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
        } else {
           setFetchError('Joke not found or you do not have permission to edit it.');
           toast({ title: 'Error', description: 'Joke not found or permission denied.', variant: 'destructive' });
           // Optionally redirect after a delay or let the user click back
           // setTimeout(() => router.push('/'), 3000);
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
             // Redirect to auth page if not logged in, preserving the return path
             router.push(`/auth?redirect=/edit-joke/${jokeId}`);
         } else {
            fetchJoke();
         }
    }
  }, [jokeId, user, authLoading, getJokeById, form, router, toast]); // Dependencies

  const onSubmit: SubmitHandler<EditJokeFormValues> = async (data) => {
    if (!user || !joke) return; // Should not happen if UI is disabled correctly

    // Check if data actually changed
     if (data.text === joke.text && data.category === joke.category && data.funnyRate === joke.funnyRate) {
         toast({ title: 'No Changes', description: 'No changes were made to the joke.' });
         router.push('/'); // Navigate back home
         return;
     }


    setIsSubmitting(true);
    try {
      await updateJoke(joke.id, data);
      toast({ title: 'Success', description: 'Joke updated successfully!' });
      router.push('/'); // Navigate back to home page on success
    } catch (error) {
      console.error("Failed to update joke:", error);
      // Toasting handled within updateJoke context function for specific errors
      // Generic fallback
       if (!(error instanceof Error && error.message.includes("Category"))) {
           toast({ title: 'Update Error', description: 'Failed to update joke.', variant: 'destructive' });
       }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = authLoading || loadingJokeData || loadingCategories || isSubmitting || !user || !!fetchError;
  const categoryNames = Array.isArray(categories) ? categories.map(cat => cat.name) : [];

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
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Programming, Dad Jokes (type new or select)" {...field} list="category-suggestions" disabled={isFormDisabled}/>
                    </FormControl>
                    <datalist id="category-suggestions">
                      {categoryNames.map((catName) => (
                        <option key={catName} value={catName} />
                      ))}
                    </datalist>
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
