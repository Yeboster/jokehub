
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useJokes, type FilterParams } from '@/contexts/JokeContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Input, Label, Dialog, ScrollArea removed as AddJokeForm modal is gone
import { ArrowRight, Laugh, Loader2, PlusCircle, Wand2 } from 'lucide-react';
import type { Joke } from '@/lib/types';
// AddJokeForm and related types are no longer used here for a modal
import { useToast } from '@/hooks/use-toast';


const StaticJokeDisplay: React.FC<{ text: string; category: string }> = ({ text, category }) => (
  <Card className="bg-card shadow-lg rounded-lg text-left hover:shadow-xl transition-shadow duration-300">
    <CardHeader className="pb-3 pt-5 px-5">
      <CardTitle className="text-lg font-medium text-primary text-center">{category}</CardTitle>
    </CardHeader>
    <CardContent className="px-5 pb-5">
      <p className="text-foreground leading-relaxed">{text}</p>
    </CardContent>
  </Card>
);

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const { jokes, loadJokesWithFilters, loadingInitialJokes } = useJokes(); // addJoke removed
  const [displayedJokes, setDisplayedJokes] = useState<Joke[]>([]);
  // Removed toast from here as modal is gone, errors/success for add joke will be on /add-joke page
  // const { toast } = useToast();

  // Removed modal and AI generation states
  // const [isAddJokeModalOpen, setIsAddJokeModalOpen] = useState(false);
  // const [isGeneratingJoke, setIsGeneratingJoke] = useState(false);
  // const [aiTopicHint, setAiTopicHint] = useState<string | undefined>();
  // const [aiGeneratedText, setAiGeneratedText] = useState<string | undefined>();
  // const [aiGeneratedCategory, setAiGeneratedCategory] = useState<string | undefined>();


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
        scope: user ? 'user' : 'public', 
      };
      loadJokesWithFilters(filters);
    }
  }, [user, authLoading, loadJokesWithFilters]);

  useEffect(() => {
    if (user) {
      setDisplayedJokes((jokes || []).slice(0, 3));
    } else {
      if (jokes && jokes.length > 0) { 
        setDisplayedJokes(jokes.slice(0,3));
      } else if (!loadingInitialJokes) { 
         setDisplayedJokes(hardcodedJokes);
      }
    }
  }, [user, jokes, loadingInitialJokes]);


  const isLoading = authLoading || loadingInitialJokes;

  // Removed AI generation and add joke modal handlers
  // handleGenerateJokeInModal
  // handleAiJokeSubmittedFromModal
  // handleAddJokeFromFormInModal


  return (
    <div className="container mx-auto px-4 py-10 sm:py-16 text-center">
      <header className="mb-12 sm:mb-16">
        <Laugh className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-primary mb-5" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary mb-4">
          Welcome to Joke Hub!
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-16">
          Your personal space to collect, create, and cherish every chuckle. Dive in and let the laughter begin!
        </p>
      </header>

      <section className="mb-12 sm:mb-16">
        <h2 className="text-3xl font-bold text-center text-primary mb-10">
          {user ? "Your Latest Laughs" : "A Taste of Humor"} 
        </h2>
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[150px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading jokes...</p>
          </div>
        ) : displayedJokes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
            {displayedJokes.map((joke) => (
              <StaticJokeDisplay key={joke.id} text={joke.text} category={joke.category} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            {user ? "You haven't added any jokes yet. Go to 'Jokes' page to add some!" : "No sample jokes to display right now."}
          </p>
        )}
      </section>

      <section className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mt-12">
        <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg">
          <Link href="/jokes">
            Explore All Jokes <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>

        {user && (
           <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-3 rounded-lg">
             <Link href="/add-joke">
                <PlusCircle className="mr-2 h-5 w-5" />
                Add New Joke
             </Link>
            </Button>
        )}

        {user && (
           <Button size="lg" variant="outline" asChild className="px-6 py-3 rounded-lg border-primary/50 text-primary hover:bg-primary/5 hover:text-primary">
            <Link href="/jokes">
              View My Collection 
            </Link>
          </Button>
        )}

        {!user && !authLoading && (
          <Button size="lg" variant="outline" asChild className="px-6 py-3 rounded-lg border-primary/50 text-primary hover:bg-primary/5 hover:text-primary">
            <Link href="/auth?redirect=/jokes">
              Log In or Sign Up
            </Link>
          </Button>
        )}
      </section>

      <footer className="mt-20 pt-10 border-t border-border/30">
        <p className="text-xs sm:text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Joke Hub. Keep laughing!
        </p>
      </footer>
    </div>
  );
}
