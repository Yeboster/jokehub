
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Wand2, PlusCircle, ArrowLeft, ShieldAlert } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useJokes } from '@/contexts/JokeContext';
import type { GenerateJokeOutput } from '@/ai/flows/generate-joke-flow';
import Header from '@/components/header';
import AddJokeForm, { type JokeFormValues } from '@/components/add-joke-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function AddJokePage() {
  const { user, loading: authLoading } = useAuth();
  const { addJoke, loadingInitialJokes: loadingContext } = useJokes();
  const router = useRouter();
  const { toast } = useToast();

  const [isGeneratingJoke, setIsGeneratingJoke] = useState(false);
  const [aiTopicHint, setAiTopicHint] = useState<string | undefined>('');
  const [aiGeneratedText, setAiGeneratedText] = useState<string | undefined>();
  const [aiGeneratedCategory, setAiGeneratedCategory] = useState<string | undefined>();
  
  // General loading state for the page setup (auth check, context loading)
  const [isPageLoading, setIsPageLoading] = useState(true);


  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth?redirect=/add-joke');
      } else {
        setIsPageLoading(loadingContext); // Page is ready when auth is checked and context isn't loading
      }
    }
  }, [user, authLoading, loadingContext, router]);

  const handleGenerateJoke = async () => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please log in to generate jokes.', variant: 'destructive' });
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
      toast({ title: 'Joke Generated!', description: 'The joke has been pre-filled in the form.' });
    } catch (error: any) {
      console.error("Error generating joke via API:", error);
      toast({ title: 'AI Error', description: error.message || 'Failed to generate joke.', variant: 'destructive' });
    } finally {
      setIsGeneratingJoke(false);
    }
  };

  const handleAddJokeAndRedirect = async (data: JokeFormValues) => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please log in to add jokes.', variant: 'destructive' });
      return;
    }
    // The AddJokeForm component handles its own isSubmitting state.
    // We don't need a separate one here unless wrapping its submission.
    try {
      await addJoke(data);
      toast({ title: 'Success!', description: 'Your joke has been added.', variant: 'default' });
      router.push('/jokes');
    } catch (error) {
      // Error toast is likely handled within addJoke or the form itself.
      // If not, add one here.
      console.error("Error submitting joke from page:", error);
    }
  };
  
  const handleAiJokeUsedInForm = () => {
    // Optional: Clear AI fields after the form has potentially used them.
    // setAiGeneratedText(undefined);
    // setAiGeneratedCategory(undefined);
    // setAiTopicHint(''); // Or keep for next generation
  };

  if (isPageLoading || authLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading page...</p>
      </div>
    );
  }
  
  if (!user) {
     // This case should ideally be handled by the redirect, but as a fallback:
     return (
        <div className="container mx-auto p-4 md:p-8">
            <Header title="Add New Joke" />
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="text-destructive">Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive flex items-center">
                        <ShieldAlert className="mr-2 h-5 w-5 flex-shrink-0" />
                        <p>You must be logged in to add a new joke.</p>
                    </div>
                    <Button onClick={() => router.push('/auth?redirect=/add-joke')}>
                        Log In or Sign Up
                    </Button>
                </CardContent>
            </Card>
        </div>
     );
  }


  return (
    <div className="container mx-auto p-4 md:p-8">
      <Header title="Craft a New Joke" />
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="md:col-span-1 flex flex-col space-y-4">
          <Card className="flex-grow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Wand2 className="mr-2 h-5 w-5 text-primary"/> AI Assistant
              </CardTitle>
              <CardDescription className="text-sm">
                Let AI spark your creativity or generate a full joke.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="ai-topic-hint-page" className="text-sm font-medium">Topic Hint (Optional)</Label>
                <Input
                  id="ai-topic-hint-page"
                  type="text"
                  placeholder="e.g., animals, space"
                  value={aiTopicHint || ''}
                  onChange={(e) => setAiTopicHint(e.target.value)}
                  disabled={isGeneratingJoke}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleGenerateJoke}
                disabled={isGeneratingJoke || !user}
                className="w-full"
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
                  Tip: Click generate again. The current text will be used to encourage variety.
                </p>
              )}
            </CardContent>
          </Card>
           <Button variant="outline" onClick={() => router.push('/jokes')} className="w-full mt-auto"> {/* mt-auto pushes to bottom if Card is taller */}
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jokes List
          </Button>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <PlusCircle className="mr-2 h-5 w-5 text-primary"/> Your New Joke
              </CardTitle>
              <CardDescription className="text-sm">
                {aiGeneratedText ? "Review the AI-generated joke below, or clear and write your own." : "Fill in the details for your joke below."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddJokeForm
                onAddJoke={handleAddJokeAndRedirect}
                aiGeneratedText={aiGeneratedText}
                aiGeneratedCategory={aiGeneratedCategory}
                onAiJokeSubmitted={handleAiJokeUsedInForm}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
