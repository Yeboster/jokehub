
"use client";

import type { FC } from 'react';
import { format } from 'date-fns';
import { Check, Square, Loader2, Pencil } from 'lucide-react'; // Removed ChevronDown, added Pencil
import { useState } from 'react'; // Removed useRef
import Link from 'next/link';

import type { Joke } from '@/lib/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Added Badge
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StarRating from '@/components/StarRating';
import { useJokes } from '@/contexts/JokeContext';
// Popover, PopoverContent, PopoverTrigger, Label, Input removed as they are no longer used for category editing here

interface JokeListItemProps {
  joke: Joke;
}

const JokeListItem: FC<JokeListItemProps> = ({ joke }) => {
  // Removed categories, updateJokeCategory from useJokes as category isn't edited here anymore
  const { rateJoke, toggleUsed } = useJokes();
  const [isTogglingUsed, setIsTogglingUsed] = useState(false);
  const [isRating, setIsRating] = useState(false);
  // Removed category editing state: isUpdatingCategory, isCategoryPopoverOpen, editableCategory, categoryInputRef, handleCategoryUpdate, handlePopoverOpenChange

  const handleRatingChange = async (newRating: number) => {
    if (joke.funnyRate === newRating) return;
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
      <TableCell className="font-medium max-w-xs truncate" title={joke.text}>{joke.text}</TableCell>
      <TableCell>
        {/* Display category using Badge */}
        <Badge variant="secondary">{joke.category}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center">
            <StarRating
              rating={joke.funnyRate}
              onRatingChange={handleRatingChange}
              size={18}
              disabled={isRating}
            />
            {isRating && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-flex" />}
        </div>
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
       {/* Actions Cell */}
      <TableCell className="text-center">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" asChild>
                        <Link href={`/edit-joke/${joke.id}`}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit Joke</span>
                        </Link>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Edit Joke</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
};

export default JokeListItem;

