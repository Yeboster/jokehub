
"use client";

import type { FC } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useJokes } from '@/contexts/JokeContext'; // Import useJokes
import Link from 'next/link';

const jokeFormSchema = z.object({
  text: z.string().min(1, 'Joke text cannot be empty.'),
  // Ensure category is trimmed and validated
  category: z.string().trim().min(1, 'Category cannot be empty. Type a new one or select from suggestions.'),
  funnyRate: z.coerce.number().min(0).max(5).optional().default(0),
});

type JokeFormValues = z.infer<typeof jokeFormSchema>;

interface AddJokeFormProps {
  onAddJoke: (data: JokeFormValues) => Promise<void>;
}

const AddJokeForm: FC<AddJokeFormProps> = ({ onAddJoke }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { categories, loadingInitialJokes: loadingCategories } = useJokes(); // Get categories and their loading state

  const form = useForm<JokeFormValues>({
    resolver: zodResolver(jokeFormSchema),
    defaultValues: {
      text: '',
      category: '',
      funnyRate: 0,
    },
  });

  const onSubmit: SubmitHandler<JokeFormValues> = async (data) => {
    if (!user) {
      form.setError("root", {message: "You must be logged in to add a joke."});
      return;
    }
    setIsSubmitting(true);
    try {
      // The category name is already trimmed by the schema validation
      await onAddJoke(data); // onAddJoke is JokeContext.addJoke, which handles category creation
      form.reset();
    } catch (error) {
      console.error("Failed to add joke from form:", error);
      // Toasting for specific errors is handled in JokeContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = !user || isSubmitting || loadingCategories; // Disable form if categories are loading
  const categoryNames = Array.isArray(categories) ? categories.map(cat => cat.name) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a New Joke</CardTitle>
      </CardHeader>
      <CardContent>
        {!user && (
          <div className="mb-4 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-700 flex items-center">
            <ShieldAlert className="mr-2 h-5 w-5" />
            <div>
              Please <Link href="/auth?redirect=/manage" className="font-semibold underline hover:text-yellow-800">log in or sign up</Link> to add jokes.
            </div>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Joke Text</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter the joke text..." {...field} disabled={isFormDisabled} />
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
                     {/* Use Input with datalist for suggestions. User can still type a new category. */}
                    <Input
                      placeholder={loadingCategories ? "Loading categories..." : "e.g., Programming (type new or select)"}
                      {...field}
                      list="category-suggestions"
                      disabled={isFormDisabled} // Disable if not logged in, submitting, or categories loading
                      autoComplete="off" // Prevent browser's own autocomplete interfering
                     />
                  </FormControl>
                   {/* Datalist provides suggestions based on existing categories */}
                  <datalist id="category-suggestions">
                    {categoryNames.map((catName) => (
                      <option key={catName} value={catName} />
                    ))}
                  </datalist>
                  {/* FormMessage shows validation errors (e.g., "Category cannot be empty") */}
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
             {form.formState.errors.root && (
                <FormMessage>{form.formState.errors.root.message}</FormMessage>
             )}
            <Button type="submit" className="w-full sm:w-auto" disabled={isFormDisabled}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2" />
              )}
              {isSubmitting ? 'Adding...' : 'Add Joke'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AddJokeForm;
