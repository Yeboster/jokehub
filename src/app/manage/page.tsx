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
    // AddJokeForm will get categories from context itself.
    // Jokes and categories can be null if loading from JokeContext
    const { jokes, categories, addJoke, importJokes } = useJokes(); 
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth?redirect=/manage');
        }
    }, [user, authLoading, router]);

    // Combined loading state for auth, jokes, and categories
    if (authLoading || (!user && !authLoading)) { // Auth check first
        return (
            <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="mt-2 text-muted-foreground">Checking authentication...</p>
            </div>
        );
    }
    
    if (jokes === null || categories === null) { // Then check for jokes/categories data
      return (
        <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading your data...</p>
        </div>
      );
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Header title="Manage Your Jokes" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* AddJokeForm no longer needs categories prop, it gets them from context */}
                <AddJokeForm onAddJoke={addJoke} /> 
                <CSVImport onImport={importJokes} />
            </div>
        </div>
    );
}
