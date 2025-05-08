
"use client";

import { useMemo, useEffect } from 'react';
import AddJokeForm from '@/components/add-joke-form';
import CSVImport from '@/components/csv-import';
import Header from '@/components/header';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ManageJokesPage() {
    const { user, loading: authLoading } = useAuth();
    const { jokes, addJoke, importJokes } = useJokes(); // jokes can be null if loading from JokeContext
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth?redirect=/manage');
        }
    }, [user, authLoading, router]);

    const uniqueCategories = useMemo(() => {
        if (!jokes) return []; // jokes can be null
        const categories = new Set(jokes.map(joke => joke.category));
        return Array.from(categories).sort();
    }, [jokes]);

    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="mt-2 text-muted-foreground">Checking authentication...</p>
            </div>
        );
    }

    // Jokes might still be loading from JokeContext after auth is confirmed
    if (jokes === null) {
      return (
        <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading your jokes...</p>
        </div>
      );
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Header title="Manage Your Jokes" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AddJokeForm onAddJoke={addJoke} categories={uniqueCategories} />
                <CSVImport onImport={importJokes} />
            </div>
        </div>
    );
}
