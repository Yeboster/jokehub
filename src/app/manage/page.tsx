"use client";

import { useMemo } from 'react';
import AddJokeForm from '@/components/add-joke-form';
import CSVImport from '@/components/csv-import';
import Header from '@/components/header';
import { useJokes } from '@/contexts/JokeContext'; // Import useJokes hook

export default function ManageJokesPage() {
    const { jokes, addJoke, importJokes } = useJokes();

    const uniqueCategories = useMemo(() => {
        if (!jokes) return [];
        const categories = new Set(jokes.map(joke => joke.category));
        return Array.from(categories).sort();
    }, [jokes]);

    // Handle loading state if jokes are not yet available
    if (jokes === null) {
      return <div className="container mx-auto p-4 md:p-8">Loading...</div>;
    }


    return (
        <div className="container mx-auto p-4 md:p-8">
            <Header title="Manage Jokes" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AddJokeForm onAddJoke={addJoke} categories={uniqueCategories} />
                <CSVImport onImport={importJokes} />
            </div>
        </div>
    );
}
