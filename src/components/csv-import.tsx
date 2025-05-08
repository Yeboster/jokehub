
"use client";

import type { FC, ChangeEvent } from 'react';
import { useState, useRef } from 'react';
import { Upload, ShieldAlert } from 'lucide-react';

import type { Joke } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import Link from 'next/link';

interface CSVImportProps {
  onImport: (jokes: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[]) => Promise<void>;
}

const CSVImport: FC<CSVImportProps> = ({ onImport }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth(); // Get user state

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to import jokes.', variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        toast({
          title: 'Error Reading File',
          description: 'Could not read the file content.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      try {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length <= 1) {
          throw new Error('CSV file needs at least one data row (after headers).');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const textIndex = headers.indexOf('text');
        const categoryIndex = headers.indexOf('category');
        const funnyRateIndex = headers.indexOf('funnyrate');

        if (textIndex === -1 || categoryIndex === -1) {
          throw new Error('CSV must contain "text" and "category" columns.');
        }

        const importedJokes: Omit<Joke, 'id' | 'used' | 'dateAdded' | 'userId'>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(','); 
           if (values.length > Math.max(textIndex, categoryIndex) && values[textIndex]?.trim() && values[categoryIndex]?.trim()) {
             const funnyRateValue = funnyRateIndex !== -1 && values[funnyRateIndex]?.trim() ? parseInt(values[funnyRateIndex].trim(), 10) : 0;
             const rate = (isNaN(funnyRateValue) || funnyRateValue < 0 || funnyRateValue > 5) ? 0 : funnyRateValue;
             
             importedJokes.push({
               text: values[textIndex].trim(),
               category: values[categoryIndex].trim(),
               funnyRate: rate,
             });
           } else {
              console.warn(`Skipping invalid row ${i+1}: ${lines[i]}`);
           }
        }

        if (importedJokes.length > 0) {
          await onImport(importedJokes);
        } else {
           toast({
            title: 'Import Failed',
            description: 'No valid jokes found in the CSV file.',
            variant: 'destructive',
          });
        }

      } catch (error: any) {
        toast({
          title: 'Import Error',
          description: error.message || 'Failed to parse CSV file.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast({
        title: 'File Read Error',
        description: 'An error occurred while reading the file.',
        variant: 'destructive',
      });
      setIsLoading(false);
       if (fileInputRef.current) {
          fileInputRef.current.value = '';
       }
    };

    reader.readAsText(file);
  };

  const isImportDisabled = !user || isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Jokes from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file with "text", "category", and optionally "funnyrate" (0-5) columns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!user && (
          <div className="mb-4 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-700 flex items-center">
            <ShieldAlert className="mr-2 h-5 w-5" />
            <div>
              Please <Link href="/auth?redirect=/manage" className="font-semibold underline hover:text-yellow-800">log in or sign up</Link> to import jokes.
            </div>
          </div>
        )}
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="csv-file">Select CSV File</Label>
          <div className="flex w-full max-w-sm items-center space-x-2">
             <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isImportDisabled}
                ref={fileInputRef}
                className="cursor-pointer file:cursor-pointer file:text-sm file:font-semibold file:text-primary file:bg-accent file:border-none file:rounded-md file:px-3 file:py-1.5 hover:file:bg-primary/10"
             />
             <Button onClick={() => fileInputRef.current?.click()} disabled={isImportDisabled} variant="outline">
                <Upload className="mr-2 h-4 w-4" /> {isLoading ? 'Importing...' : 'Upload'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVImport;
