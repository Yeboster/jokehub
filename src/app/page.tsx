
"use client";

import { useEffect, useState } from 'react'; // Added useEffect and useState
import { useAuth } from '@/contexts/AuthContext';
import { useJokes, type FilterParams } from '@/contexts/JokeContext'; // Import FilterParams
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Laugh, Loader2 } from 'lucide-react';
import type { Joke } from '@/lib/types'; // Ensure Joke type is imported

const StaticJokeDisplay: React.FC<{ text: string; category: string }> = ({ text, category }) => (
  <Card className="bg-muted/30 shadow-md">
    <CardHeader className="pb-2 pt-4">
      <CardTitle className="text-base font-semibold">{category}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-foreground/80">{text}</p>
    </CardContent>
  </Card>
);

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  // Use loadJokesWithFilters to fetch a few public jokes for logged-out users or user's jokes if logged in.
  const { jokes, loadJokesWithFilters, loadingInitialJokes } = useJokes();
  const [displayedJokes, setDisplayedJokes] = useState<Joke[]>([]);

  const hardcodedJokes = [
    { id: 'hc1', text: "Why don't scientists trust atoms? Because they make up everything!", category: "Science", dateAdded: new Date(), used: false, funnyRate: 0, userId: 'public' },
    { id: 'hc2', text: "Why did the scarecrow win an award? Because he was outstanding in his field!", category: "Puns", dateAdded: new Date(), used: false, funnyRate: 0, userId: 'public' },
    { id: 'hc3', text: "What do you call fake spaghetti? An impasta!", category: "Food", dateAdded: new Date(), used: false, funnyRate: 0, userId: 'public' },
  ];

  useEffect(() => {
    if (!authLoading) {
      const filters: FilterParams = {
        selectedCategories: [],
        filterFunnyRate: -1,
        showOnlyUsed: false,
        scope: user ? 'user' : 'public', // Fetch user's jokes or public jokes
      };
      loadJokesWithFilters(filters);
    }
  }, [user, authLoading, loadJokesWithFilters]);

  useEffect(() => {
    if (user) {
      setDisplayedJokes((jokes || []).slice(0, 3));
    } else {
      if (jokes && jokes.length > 0) { // Prefer fetched public jokes
        setDisplayedJokes(jokes.slice(0,3));
      } else if (!loadingInitialJokes) { // Fallback to hardcoded if public fetch yields nothing
         setDisplayedJokes(hardcodedJokes);
      }
    }
  }, [user, jokes, loadingInitialJokes]);


  const isLoading = authLoading || loadingInitialJokes;

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 text-center">
      <header className="mb-12">
        <Laugh className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary mb-4">
          Welcome to Joke Hub!
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Your personal space to collect, create, and cherish every chuckle. Dive in and let the laughter begin!
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-6">
          {user ? "Your Latest Laughs" : "A Taste of Humor"}
        </h2>
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[150px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading jokes...</p>
          </div>
        ) : displayedJokes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
            {displayedJokes.map((joke) => (
              <StaticJokeDisplay key={joke.id} text={joke.text} category={joke.category} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            {user ? "You haven't added any jokes yet. Go to 'My Jokes' to add some!" : "No sample jokes to display right now."}
          </p>
        )}
      </section>

      <section className="space-y-4 md:space-y-0 md:flex md:items-center md:justify-center md:space-x-4">
        <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/jokes"> {/* Link to public "All Jokes" feed */}
            Explore All Jokes <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
        {user && (
           <Button size="lg" variant="outline" asChild>
            <Link href="/my-jokes">
              View My Jokes
            </Link>
          </Button>
        )}
        {!user && !authLoading && (
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth?redirect=/my-jokes"> {/* Redirect to My Jokes after login */}
              Log In or Sign Up
            </Link>
          </Button>
        )}
      </section>

      <footer className="mt-16 pt-8 border-t border-border/50">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Joke Hub. Keep laughing!
        </p>
      </footer>
    </div>
  );
}
