"use client";

import type { FC } from 'react';
import { format } from 'date-fns';
import { Check, Square } from 'lucide-react';

import type { Joke } from '@/lib/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StarRating from '@/components/StarRating';
import { useJokes } from '@/contexts/JokeContext';

interface JokeListItemProps {
  joke: Joke;
  onToggleUsed: (id: string) => void;
}

const JokeListItem: FC<JokeListItemProps> = ({ joke, onToggleUsed }) => {
  const { rateJoke } = useJokes();

  const handleRatingChange = (newRating: number) => {
    rateJoke(joke.id, newRating);
  };

  return (
    <TableRow key={joke.id} data-state={joke.used ? 'selected' : undefined}>
      <TableCell className="font-medium">{joke.text}</TableCell>
      <TableCell>
        <Badge variant="secondary">{joke.category}</Badge>
      </TableCell>
      <TableCell>
        <StarRating rating={joke.funnyRate} onRatingChange={handleRatingChange} size={18} />
      </TableCell>
      <TableCell>{format(joke.dateAdded, 'PP')}</TableCell>
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleUsed(joke.id)}
                aria-label={joke.used ? 'Mark as unused' : 'Mark as used'}
              >
                {joke.used ? <Check className="text-green-600" /> : <Square />}
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
