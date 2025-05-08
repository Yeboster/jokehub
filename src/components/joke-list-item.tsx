
"use client";

import type { FC } from 'react';
import { format } from 'date-fns';
import { Check, Square, Loader2 } from 'lucide-react';
import { useState } from 'react';

import type { Joke } from '@/lib/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StarRating from '@/components/StarRating';
import { useJokes } from '@/contexts/JokeContext';

interface JokeListItemProps {
  joke: Joke;
  // onToggleUsed is removed as context now handles it directly via ID and current status
}

const JokeListItem: FC<JokeListItemProps> = ({ joke }) => {
  const { rateJoke, toggleUsed } = useJokes();
  const [isTogglingUsed, setIsTogglingUsed] = useState(false);
  const [isRating, setIsRating] = useState(false);

  const handleRatingChange = async (newRating: number) => {
    if (joke.funnyRate === newRating) return; // Avoid unnecessary updates
    setIsRating(true);
    await rateJoke(joke.id, newRating);
    setIsRating(false);
  };

  const handleToggleUsed = async () => {
    setIsTogglingUsed(true);
    await toggleUsed(joke.id, joke.used);
    setIsTogglingUsed(false);
  };

  return (
    <TableRow key={joke.id} data-state={joke.used ? 'selected' : undefined}>
      <TableCell className="font-medium">{joke.text}</TableCell>
      <TableCell>
        <Badge variant="secondary">{joke.category}</Badge>
      </TableCell>
      <TableCell>
        <StarRating 
          rating={joke.funnyRate} 
          onRatingChange={handleRatingChange} 
          size={18} 
          disabled={isRating} 
        />
         {isRating && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-flex" />}
      </TableCell>
      <TableCell>{format(joke.dateAdded, 'PP')}</TableCell>
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleUsed}
                disabled={isTogglingUsed}
                aria-label={joke.used ? 'Mark as unused' : 'Mark as used'}
              >
                {isTogglingUsed ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : joke.used ? (
                  <Check className="text-green-600" />
                ) : (
                  <Square />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{joke.used ? 'Mark as unused' : 'Mark as used'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
};

export default JokeListItem;
