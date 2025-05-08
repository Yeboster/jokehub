
"use client";

import type { FC } from 'react';
import { format } from 'date-fns';
import { Check, Square, Loader2, ChevronDown } from 'lucide-react';
import { useState, useRef } from 'react';

import type { Joke } from '@/lib/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
// Select, SelectContent, SelectItem, SelectTrigger, SelectValue removed as they are no longer used
import { Input } from '@/components/ui/input'; // For new category input
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StarRating from '@/components/StarRating';
import { useJokes } from '@/contexts/JokeContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // For category editing
import { Label } from '@/components/ui/label';

interface JokeListItemProps {
  joke: Joke;
}

const JokeListItem: FC<JokeListItemProps> = ({ joke }) => {
  const { categories, rateJoke, toggleUsed, updateJokeCategory } = useJokes();
  const [isTogglingUsed, setIsTogglingUsed] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const [editableCategory, setEditableCategory] = useState(joke.category);
  const categoryInputRef = useRef<HTMLInputElement>(null);

  const categoryNames = Array.isArray(categories) ? categories.map(cat => cat.name).sort() : [];

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

  const handleCategoryUpdate = async () => {
    if (!editableCategory.trim() || editableCategory.trim() === joke.category) {
      setIsCategoryPopoverOpen(false);
      setEditableCategory(joke.category); // Reset if no change or empty
      return;
    }
    setIsUpdatingCategory(true);
    await updateJokeCategory(joke.id, editableCategory.trim());
    setIsUpdatingCategory(false);
    setIsCategoryPopoverOpen(false);
    // No need to setEditableCategory(joke.category) here, as the joke prop will re-render with new category
  };

  const handlePopoverOpenChange = (open: boolean) => {
    setIsCategoryPopoverOpen(open);
    if (open) {
      setEditableCategory(joke.category); // Reset to current joke category on open
      // Automatically focus the input when popover opens
      setTimeout(() => categoryInputRef.current?.focus(), 0);
    }
  };


  return (
    <TableRow key={joke.id} data-state={joke.used ? 'selected' : undefined}>
      <TableCell className="font-medium">{joke.text}</TableCell>
      <TableCell>
        <Popover open={isCategoryPopoverOpen} onOpenChange={handlePopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-[150px] justify-between"
              disabled={isUpdatingCategory || categories === null}
            >
              {isUpdatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : joke.category}
              {!isUpdatingCategory && <ChevronDown className="ml-2 h-4 w-4 opacity-50" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <div className="p-2 space-y-2">
              <Label htmlFor={`category-edit-${joke.id}`}>Edit Category</Label>
              <Input
                id={`category-edit-${joke.id}`}
                ref={categoryInputRef}
                value={editableCategory}
                onChange={(e) => setEditableCategory(e.target.value)}
                list={`category-suggestions-${joke.id}`}
                placeholder="Type or select category"
                className="mb-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCategoryUpdate();
                  }
                }}
              />
              <datalist id={`category-suggestions-${joke.id}`}>
                {categoryNames.map((catName) => (
                  <option key={catName} value={catName} />
                ))}
              </datalist>
              {/* Removed the Select component for category selection as it was redundant with the datalist input */}
              <Button onClick={handleCategoryUpdate} size="sm" className="w-full" disabled={isUpdatingCategory || !editableCategory.trim()}>
                {isUpdatingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Category"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
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

