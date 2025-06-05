
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useJokes } from '@/contexts/JokeContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Laugh, Loader2 } from 'lucide-react';

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
  const { jokes, loadingInitialJokes } = useJokes();

  const hardcodedJokes = [
    { id: 'hc1', text: "Why don't scientists trust atoms? Because they make up everything!", category: "Science" },
    { id: 'hc2', text: "Why did the scarecrow win an award? Because he was outstanding in his field!", category: "Puns" },
    { id: 'hc3', text: "What do you call fake spaghetti? An impasta!", category: "Food" },
  ];

  const jokesToShow = user 
    ? (jokes || []).slice(0, 3) 
    : hardcodedJokes;

  const isLoading = authLoading || (user && loadingInitialJokes);

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
        ) : jokesToShow.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
            {jokesToShow.map((joke) => (
              <StaticJokeDisplay key={joke.id} text={joke.text} category={joke.category} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            {user ? "You haven't added any jokes yet. Let's get started!" : "No sample jokes to display right now."}
          </p>
        )}
      </section>

      <section className="space-y-4 md:space-y-0 md:space-x-4">
        <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/jokes">
            Explore All Jokes <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
        {!user && !authLoading && (
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth?redirect=/jokes">
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
