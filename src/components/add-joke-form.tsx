"use client";

import type { FC } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const jokeFormSchema = z.object({
  text: z.string().min(1, 'Joke text cannot be empty.'),
  category: z.string().min(1, 'Category cannot be empty.'),
  funnyRate: z.coerce.number().min(0).max(5).optional().default(0),
});

type JokeFormValues = z.infer<typeof jokeFormSchema>;

interface AddJokeFormProps {
  onAddJoke: (data: JokeFormValues) => void;
  categories: string[];
}

const AddJokeForm: FC<AddJokeFormProps> = ({ onAddJoke, categories }) => {
  const form = useForm<JokeFormValues>({
    resolver: zodResolver(jokeFormSchema),
    defaultValues: {
      text: '',
      category: '',
      funnyRate: 0,
    },
  });

  const onSubmit: SubmitHandler<JokeFormValues> = (data) => {
    onAddJoke(data);
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a New Joke</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Joke Text</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter the joke text..." {...field} />
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
                    <Input placeholder="e.g., Programming, Dad Jokes" {...field} list="category-suggestions"/>
                  </FormControl>
                   <datalist id="category-suggestions">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
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
                    defaultValue={field.value?.toString() || "0"}
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
            <Button type="submit" className="w-full sm:w-auto">
              <Plus className="mr-2" /> Add Joke
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AddJokeForm;
