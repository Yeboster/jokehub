
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2, ArrowLeft, ShieldAlert, CalendarDays, Tag, Star as StarIcon } from 'lucide-react';

import type { Joke } from '@/lib/types';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import StarRating from '@/components/StarRating';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function JokeShowPage() {
  const params = useParams();
  const router = useRouter();
  const { getJokeById, loadingInitialJokes: loadingContext } = useJokes();
  const { user, loading: authLoading } = useAuth(); // To potentially show "Posted by you"

  const [joke, setJoke] = useState<Joke | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jokeId = Array.isArray(params.jokeId) ? params.jokeId[0] : params.jokeId;

  useEffect(() => {
    async function fetchJoke() {
      if (!jokeId) {
        setError("Joke ID is missing.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const fetchedJoke = await getJokeById(jokeId);
        if (fetchedJoke) {
          setJoke(fetchedJoke);
        } else {
          setError("Joke not found. It might have been deleted or the ID is incorrect.");
        }
      } catch (err) {
        console.error("Error fetching joke:", err);
        setError("Failed to load the joke. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    // Wait for context to finish loading if it's initially loading
    // Also ensures jokeId is present
    if (!loadingContext && jokeId) {
      fetchJoke();
    } else if (!jokeId) {
        setError("Joke ID is missing.");
        setIsLoading(false);
    }
  }, [jokeId, getJokeById, loadingContext]);

  if (isLoading || authLoading || loadingContext) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading joke...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Header title="Joke Not Available" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive flex items-center">
              <ShieldAlert className="mr-2 h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
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
    // This case should ideally be covered by error state, but as a fallback
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Header title="Joke Not Found" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Hmm...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">We couldn't find the joke you're looking for.</p>
            <Button variant="outline" onClick={() => router.push('/jokes')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jokes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = user && joke.userId === user.uid;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
            <Button variant="outline" size="sm" onClick={() => router.push('/jokes')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Jokes
            </Button>
        </div>

        <Card className="shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/30 p-6">
            <CardTitle className="text-2xl md:text-3xl text-primary font-semibold">
              A Chuckle For You!
            </CardTitle>
             {isOwner && (
                <CardDescription>This is one of your curated jokes.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <p className="text-lg md:text-xl text-foreground leading-relaxed whitespace-pre-line mb-8">
              {joke.text}
            </p>

            <div className="space-y-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Tag className="mr-2 h-4 w-4 text-primary" />
                Category: <Badge variant="secondary" className="ml-2 bg-accent text-accent-foreground">{joke.category}</Badge>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                Date Added: {format(joke.dateAdded, 'MMMM d, yyyy')}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <StarIcon className="mr-2 h-4 w-4 text-primary" />
                Rating: 
                {joke.funnyRate > 0 ? (
                    <StarRating rating={joke.funnyRate} readOnly={true} size={18} className="ml-2" starClassName="text-primary" />
                ) : (
                    <span className="ml-1 italic">Unrated</span>
                )}
              </div>
               {joke.used && isOwner && (
                <div className="flex items-center text-sm text-green-600">
                  <Check className="mr-2 h-4 w-4" />
                  You've marked this joke as used.
                </div>
              )}
            </div>
          </CardContent>
          {isOwner && (
            <CardFooter className="bg-muted/20 p-6 flex justify-end">
              <Button onClick={() => router.push(`/edit-joke/${joke.id}`)}>
                Edit This Joke
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
