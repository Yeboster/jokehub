
"use client";

import { useEffect, useState } from 'react';
import AddJokeForm from '@/components/add-joke-form';
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
            const result: GenerateJokeOutput = await generateJoke({ topicHint: aiTopicHint, prefilledJoke: aiGeneratedText });
            setAiGeneratedText(result.jokeText);
            setAiGeneratedCategory(result.category);
            toast({ title: 'Joke Generated!', description: 'The joke has been pre-filled in the form below.' });
        } catch (error: any) {
            console.error("Error generating joke:", error);
            toast({ title: 'AI Error', description: error.message || 'Failed to generate joke.', variant: 'destructive' });
        } finally {
            setIsGeneratingJoke(false);
        }
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
                    onAddJoke={addJoke} 
                    aiGeneratedText={aiGeneratedText}
                    aiGeneratedCategory={aiGeneratedCategory}
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
                                value={aiTopicHint}
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
                    </CardContent>
                </Card>

                <CSVImport onImport={importJokes} />
            </div>
        </div>
    );
}
