
"use client";

import type { FC } from 'react';
import { format } from 'date-fns';
import { Check, Square, Loader2, Pencil, Tag, CalendarDays, UserCircle, StarIcon as LucideStarIcon } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

import type { Joke } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StarRating from '@/components/StarRating';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card components
import { cn } from '@/lib/utils';

interface JokeListItemProps {
  joke: Joke;
}

const JokeListItem: FC<JokeListItemProps> = ({ joke }) => {
  const { rateJoke, toggleUsed } = useJokes();
  const { user: currentUser } = useAuth(); // Get current user from AuthContext
  const [isTogglingUsed, setIsTogglingUsed] = useState(false);
  const [isRating, setIsRating] = useState(false);

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
    <Card className={cn("flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden", joke.used ? "bg-muted/30 border-primary/20" : "bg-card")}>
      <CardContent className="p-5 flex-grow">
        <p className="text-sm text-foreground leading-relaxed">{joke.text}</p>
      </CardContent>
      <CardFooter className="bg-muted/50 p-4 border-t border-border/50 flex flex-col gap-3">
        {/* Line 1: Stars, Category | Used, Edit */}
        <div className="flex justify-between items-center w-full">
          {/* Left part: Stars and Category */}
          <div className="flex items-center gap-3">
            <div className="flex items-center"> {/* Wrapper for stars and potential loader */}
              <StarRating
                rating={joke.funnyRate}
                onRatingChange={handleRatingChange}
                size={18}
                disabled={isRating || isTogglingUsed}
                starClassName="text-accent"
              />
              {isRating && <Loader2 className="ml-2 h-4 w-4 animate-spin text-primary" />}
            </div>
            <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5 text-xs">
              <Tag className="h-3.5 w-3.5" />
              {joke.category}
            </Badge>
          </div>

          {/* Right part: Used and Edit buttons */}
          <div className="flex items-center gap-1.5">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleToggleUsed}
                    disabled={isTogglingUsed || isRating}
                    aria-label={joke.used ? 'Mark as unused' : 'Mark as used'}
                  >
                    {isTogglingUsed ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : joke.used ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{joke.used ? 'Mark as unused' : 'Mark as used'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {currentUser?.uid === joke.userId && (
              <TooltipProvider delayDuration={300}>
                  <Tooltip>
                      <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8" asChild disabled={isRating || isTogglingUsed}>
                              <Link href={`/edit-joke/${joke.id}`}>
                                  <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                  <span className="sr-only">Edit Joke</span>
                              </Link>
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                          <p>Edit Joke</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        {/* Line 2: Date and User */}
        <div className="flex justify-between items-center w-full text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(joke.dateAdded, 'PP')}
          </div>
          {currentUser?.email && joke.userId === currentUser.uid && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 cursor-default">
                      <UserCircle className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[100px] sm:max-w-[120px]"> 
                          {currentUser.email}
                      </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Posted by: {currentUser.email}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default JokeListItem;

