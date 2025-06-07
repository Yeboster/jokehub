
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useJokes, type FilterParams } from '@/contexts/JokeContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, Laugh, Loader2, PlusCircle, Wand2 } from 'lucide-react';
import type { Joke } from '@/lib/types';
import AddJokeForm, { type JokeFormValues } from '@/components/add-joke-form';
import type { GenerateJokeOutput } from '@/ai/flows/generate-joke-flow';
import { useToast } from '@/hooks/use-toast';


const StaticJokeDisplay: React.FC<{ text: string; category: string }> = ({ text, category }) => (
  <Card className="bg-card shadow-md rounded-lg text-left hover:shadow-xl transition-shadow duration-300">
    <CardHeader className="pb-2 pt-4 px-5">
      <CardTitle className="text-md font-semibold text-primary text-center">{category}</CardTitle>
    </CardHeader>
    <CardContent className="px-5 pb-5">
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </CardContent>
  </Card>
);

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const { jokes, loadJokesWithFilters, loadingInitialJokes, addJoke } = useJokes();
  const [displayedJokes, setDisplayedJokes] = useState<Joke[]>([]);
  const { toast } = useToast();

  const [isAddJokeModalOpen, setIsAddJokeModalOpen] = useState(false);
  const [isGeneratingJoke, setIsGeneratingJoke] = useState(false);
  const [aiTopicHint, setAiTopicHint] = useState<string | undefined>();
  const [aiGeneratedText, setAiGeneratedText] = useState<string | undefined>();
  const [aiGeneratedCategory, setAiGeneratedCategory] = useState<string | undefined>();


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

  const handleGenerateJokeInModal = async () => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please log in to generate and add jokes.', variant: 'destructive' });
      setIsAddJokeModalOpen(false);
      return;
    }
    setIsGeneratingJoke(true);
    try {
      const trimmedTopicHint = aiTopicHint?.trim();
      const response = await fetch('/api/generate-joke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicHint: trimmedTopicHint, prefilledJoke: aiGeneratedText }),
      });

      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); } catch (e) { /* ignore */ }
        throw new Error(errorData?.error || `API request failed with status ${response.status}`);
      }
      const result: GenerateJokeOutput = await response.json();
      setAiGeneratedText(result.jokeText);
      setAiGeneratedCategory(result.category ? result.category.trim() : '');
      toast({ title: 'Joke Generated!', description: 'The joke has been pre-filled.' });
    } catch (error: any) {
      console.error("Error generating joke via API:", error);
      toast({ title: 'AI Error', description: error.message || 'Failed to generate joke.', variant: 'destructive' });
    } finally {
      setIsGeneratingJoke(false);
    }
  };

  const handleAiJokeSubmittedFromModal = () => {
    setAiGeneratedText(undefined);
    setAiGeneratedCategory(undefined);
    setAiTopicHint('');
  };

  const handleAddJokeFromFormInModal = async (data: JokeFormValues) => {
    if (!user) {
        toast({ title: 'Login Required', description: 'Please log in to add jokes.', variant: 'destructive' });
        return;
    }
    await addJoke(data);
    setIsAddJokeModalOpen(false);
     if (user) {
      const filters: FilterParams = { selectedCategories: [], filterFunnyRate: -1, showOnlyUsed: false, scope: 'user' };
      loadJokesWithFilters(filters);
    }
  };


  return (
    <div className="container mx-auto px-4 py-10 sm:py-16 text-center">
      <header className="mb-12 sm:mb-16">
        <Laugh className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-primary mb-5" />
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-primary mb-3">
          Welcome to Joke Hub!
        </h1>
        <p className="text-md sm:text-lg text-muted-foreground max-w-xl md:max-w-2xl mx-auto">
          Your personal space to collect, create, and cherish every chuckle. Dive in and let the laughter begin!
        </p>
      </header>

      <section className="mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-primary mb-8 sm:mb-10">
          {user ? "Your Latest Laughs" : "Your Latest Laughs"} 
        </h2>
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[150px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading jokes...</p>
          </div>
        ) : displayedJokes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6 max-w-4xl lg:max-w-5xl mx-auto">
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

      <section className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mt-10 sm:mt-12">
        <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg">
          <Link href="/jokes">
            Explore All Jokes <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>

        {user && (
           <Dialog open={isAddJokeModalOpen} onOpenChange={setIsAddJokeModalOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-3 rounded-lg">
                <PlusCircle className="mr-2 h-5 w-5" />
                Add New Joke
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>Add a New Joke</DialogTitle>
                <DialogDescription>
                    Create a joke manually or let AI generate one for you.
                </DialogDescription>
                </DialogHeader>
                 <ScrollArea className="max-h-[calc(80vh-150px)] md:max-h-[calc(70vh-120px)] pr-3">
                <div className="py-2 space-y-2">
                    <div className="space-y-1.5 p-2.5 border rounded-md shadow-sm bg-muted/30">
                    <h3 className="text-xs font-semibold flex items-center">
                        <Wand2 className="mr-1.5 h-3.5 w-3.5 text-primary" />
                        Generate with AI
                    </h3>
                    <div>
                        <Label htmlFor="ai-topic-hint-landing" className="text-xs">Topic Hint (Optional)</Label>
                        <Input
                            id="ai-topic-hint-landing"
                            type="text"
                            placeholder="e.g., animals, space"
                            value={aiTopicHint || ''}
                            onChange={(e) => setAiTopicHint(e.target.value)}
                            disabled={isGeneratingJoke || !user}
                            className="mt-1 h-8 text-xs"
                        />
                    </div>
                    <Button
                        onClick={handleGenerateJokeInModal}
                        disabled={isGeneratingJoke || !user}
                        className="w-full"
                        size="sm"
                    >
                        {isGeneratingJoke ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Wand2 className="mr-2 h-4 w-4" />
                        )}
                        {isGeneratingJoke ? 'Generating...' : (aiGeneratedText ? 'Generate Another' : 'Generate Joke')}
                    </Button>
                    {aiGeneratedText && (
                        <p className="text-xs text-muted-foreground pt-1">
                        Tip: Generate again for a new one.
                        </p>
                    )}
                    </div>
                    <AddJokeForm
                        onAddJoke={handleAddJokeFromFormInModal}
                        aiGeneratedText={aiGeneratedText}
                        aiGeneratedCategory={aiGeneratedCategory}
                        onAiJokeSubmitted={handleAiJokeSubmittedFromModal}
                    />
                </div>
                </ScrollArea>
            </DialogContent>
            </Dialog>
        )}

        {user && (
           <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-3 rounded-lg">
            <Link href="/jokes">
              View My Collection 
            </Link>
          </Button>
        )}

        {!user && !authLoading && (
          <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-3 rounded-lg">
            <Link href="/auth?redirect=/jokes">
              Log In or Sign Up
            </Link>
          </Button>
        )}
      </section>

      <footer className="mt-16 sm:mt-20 pt-8 sm:pt-10 border-t border-border/30">
        <p className="text-xs sm:text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Joke Hub. Keep laughing!
        </p>
      </footer>
    </div>
  );
}
