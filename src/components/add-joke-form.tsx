
"use client";

import type { FC } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2, ShieldAlert, Check, ChevronsUpDown } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useJokes } from '@/contexts/JokeContext';
import Link from 'next/link';
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

const jokeFormSchema = z.object({
  text: z.string().min(1, 'Joke text cannot be empty.'),
  category: z.string().trim().min(1, 'Category cannot be empty. Type a new one or select from suggestions.'),
  funnyRate: z.coerce.number().min(0).max(5).optional().default(0),
});

export type JokeFormValues = z.infer<typeof jokeFormSchema>; // Exporting for use in parent

interface AddJokeFormProps {
  onAddJoke: (data: JokeFormValues) => Promise<void>;
  aiGeneratedText?: string | null;
  aiGeneratedCategory?: string | null;
  onAiJokeSubmitted?: () => void;
}

const AddJokeForm: FC<AddJokeFormProps> = ({ onAddJoke, aiGeneratedText, aiGeneratedCategory, onAiJokeSubmitted }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { categories, loadingInitialJokes: loadingCategories } = useJokes();
  const [isCategoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const form = useForm<JokeFormValues>({
    resolver: zodResolver(jokeFormSchema),
    defaultValues: {
      text: '',
      category: '',
      funnyRate: 0,
    },
  });

  useEffect(() => {
    if (aiGeneratedText) {
      form.setValue('text', aiGeneratedText, { shouldValidate: true });
    } else if (aiGeneratedText === null) { // Explicitly null means clear it
        form.setValue('text', '', { shouldValidate: true });
    }

    if (aiGeneratedCategory) {
      form.setValue('category', aiGeneratedCategory, { shouldValidate: true });
      setCategorySearch(aiGeneratedCategory); 
    } else if (aiGeneratedCategory === null) { // Explicitly null means clear it
        form.setValue('category', '', { shouldValidate: true });
        setCategorySearch('');
    }
  }, [aiGeneratedText, aiGeneratedCategory, form]);

  const onSubmit: SubmitHandler<JokeFormValues> = async (data) => {
    if (!user) {
      form.setError("root", {message: "You must be logged in to add a joke."});
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddJoke(data);
      form.reset();
      setCategorySearch('');
      if (aiGeneratedText && onAiJokeSubmitted) { // Check if it was an AI joke
        onAiJokeSubmitted();
      }
    } catch (error) {
      console.error("Failed to add joke from form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = !user || isSubmitting || loadingCategories;
  const categoryNames = useMemo(() => Array.isArray(categories) ? categories.map(cat => cat.name).sort() : [], [categories]);

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
                    <Textarea placeholder="Enter the joke text..." {...field} disabled={isFormDisabled} rows={aiGeneratedText ? 6 : 3} />
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
                                     (name) => name.toLowerCase() === field.value.toLowerCase()
                                   ) || field.value 
                                 : "Select or type category..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}> 
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
                                      key={option.value} 
                                      value={option.label} 
                                      onSelect={() => {
                                        field.onChange(option.value); 
                                        setCategorySearch(option.value); // Update search to reflect selection
                                        setCategoryPopoverOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value?.toLowerCase() === option.value.toLowerCase() 
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
                    value={field.value?.toString() ?? "0"}
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
                <Plus className="mr-2 h-4 w-4" />
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
