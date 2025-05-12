
"use client";

import { useEffect } from 'react';
import AddJokeForm from '@/components/add-joke-form';
import CSVImport from '@/components/csv-import';
import Header from '@/components/header';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ManageJokesPage() {
    const { user, loading: authLoading } = useAuth();
    // Destructure loading state from JokeContext as well
    const { categories, addJoke, importJokes, loadingInitialJokes } = useJokes();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth?redirect=/manage');
        }
    }, [user, authLoading, router]);

    // Combined loading state check
    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="mt-2 text-muted-foreground">Checking authentication...</p>
            </div>
        );
    }

    // Check if initial categories are still loading (jokes aren't directly used here, but categories are)
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AddJokeForm onAddJoke={addJoke} />
                <CSVImport onImport={importJokes} />
            </div>
        </div>
    );
}

    