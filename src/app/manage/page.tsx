
"use client";

import { useEffect, useState } from 'react';
import AddJokeForm, { type JokeFormValues } from '@/components/add-joke-form'; // Import JokeFormValues
import CSVImport from '@/components/csv-import';
import Header from '@/components/header';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Wand2 } from 'lucide-react';
import { generateJoke, type GenerateJokeOutput } from '@/ai/flows/generate-joke-flow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function ManageJokesPage() {
    const { user, loading: authLoading } = useAuth();
    const { categories, addJoke, importJokes, loadingInitialJokes } = useJokes();
    const router = useRouter();
    const { toast } = useToast();

    const [isGeneratingJoke, setIsGeneratingJoke] = useState(false);
    const [aiTopicHint, setAiTopicHint] = useState<string | undefined>();
    const [aiGeneratedText, setAiGeneratedText] = useState<string | undefined>();
    const [aiGeneratedCategory, setAiGeneratedCategory] = useState<string | undefined>();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth?redirect=/manage');
        }
    }, [user, authLoading, router]);

    const handleGenerateJoke = async () => {
        if (!user) {
            toast({ title: 'Authentication Required', description: 'Please log in to generate jokes.', variant: 'destructive' });
            return;
        }
        setIsGeneratingJoke(true);
        try {
            const trimmedTopicHint = aiTopicHint?.trim();
            // Pass the current aiGeneratedText as prefilledJoke to encourage variety if re-generating
            const result: GenerateJokeOutput = await generateJoke({ topicHint: trimmedTopicHint, prefilledJoke: aiGeneratedText });
            
            setAiGeneratedText(result.jokeText);
            // Trim the category from AI to ensure consistency
            setAiGeneratedCategory(result.category ? result.category.trim() : ''); 

            toast({ title: 'Joke Generated!', description: 'The joke has been pre-filled in the form below.' });
        } catch (error: any) {
            console.error("Error generating joke:", error);
            toast({ title: 'AI Error', description: error.message || 'Failed to generate joke.', variant: 'destructive' });
        } finally {
            setIsGeneratingJoke(false);
        }
    };

    // Callback for AddJokeForm when an AI-generated joke is submitted
    const handleAiJokeSubmitted = () => {
        setAiGeneratedText(undefined); // Clear AI text from state
        setAiGeneratedCategory(undefined); // Clear AI category from state
        // Optionally clear the topic hint as well if desired
        // setAiTopicHint(''); 
    };

    // Wrapper for addJoke to pass to the form
    const handleAddJokeFromForm = async (data: JokeFormValues) => {
        await addJoke(data);
        // No need to call handleAiJokeSubmitted here, 
        // AddJokeForm's internal onSubmit will call its onAiJokeSubmitted prop if it was an AI joke.
    };
    
    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="mt-2 text-muted-foreground">Checking authentication...</p>
            </div>
        );
    }

    if (loadingInitialJokes || categories === null) {
      return (
        <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading categories...</p>
        </div>
      );
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Header title="Manage Your Jokes" />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <AddJokeForm 
                    onAddJoke={handleAddJokeFromForm} 
                    aiGeneratedText={aiGeneratedText}
                    aiGeneratedCategory={aiGeneratedCategory}
                    onAiJokeSubmitted={handleAiJokeSubmitted} // Pass the callback
                />
                
                <Card>
                    <CardHeader>
                        <CardTitle>Generate Joke with AI</CardTitle>
                        <CardDescription>Let AI create a joke for you. You can then review and add it using the form on the left.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="ai-topic-hint">Topic Hint (Optional)</Label>
                            <Input 
                                id="ai-topic-hint"
                                type="text"
                                placeholder="e.g., animals, space, food"
                                value={aiTopicHint || ''} // Ensure controlled component
                                onChange={(e) => setAiTopicHint(e.target.value)}
                                disabled={isGeneratingJoke || !user}
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
                            {isGeneratingJoke ? 'Generating...' : 'Generate Joke'}
                        </Button>
                        {aiGeneratedText && (
                            <p className="text-xs text-muted-foreground pt-2">
                                Tip: You can click "Generate Joke" again with the same or a different topic to get a new one. The current generated text will be used to encourage variety.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <CSVImport onImport={importJokes} />
            </div>
        </div>
    );
}
