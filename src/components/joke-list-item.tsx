
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
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface JokeListItemProps {
  joke: Joke;
}

const JokeListItem: FC<JokeListItemProps> = ({ joke }) => {
  const { rateJoke, toggleUsed } = useJokes();
  const { user: currentUser } = useAuth();
  const [isTogglingUsed, setIsTogglingUsed] = useState(false);
  const [isRating, setIsRating] = useState(false);

  const isOwner = currentUser?.uid === joke.userId;

  const handleRatingChange = async (newRating: number) => {
    if (!isOwner) { 
        return; 
    }
    if (joke.funnyRate === newRating) return;
    setIsRating(true);
    await rateJoke(joke.id, newRating);
    setIsRating(false);
  };

  const handleToggleUsed = async () => {
    if (!isOwner) return; 
    setIsTogglingUsed(true);
    await toggleUsed(joke.id, joke.used);
    setIsTogglingUsed(false);
  };

  return (
    <Card className={cn(
        "flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden border-primary/20", 
        joke.used && isOwner ? "bg-muted/30" : "bg-card"
    )}>
      <Link href={`/joke/${joke.id}`} passHref legacyBehavior>
        <a className="block hover:bg-accent/20 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-t-lg">
          {/* CardContent now has flex-grow to push footer down */}
          <CardContent className="p-5 flex-grow cursor-pointer">
            <div className="relative h-full"> 
              <p className="text-sm text-foreground leading-relaxed pb-8">{joke.text}</p> 
              <Badge
                variant="secondary" 
                className="absolute bottom-0 left-0 bg-accent text-accent-foreground py-0.5 px-2 text-[11px] font-semibold rounded-md"
              >
                {joke.category}
              </Badge>
            </div>
          </CardContent>
        </a>
      </Link>
      <CardFooter className="p-4 border-t border-border/50 flex items-center justify-between">
        {/* Left side: Details */}
        <div className="flex items-center flex-nowrap text-xs text-muted-foreground"> {/* Removed gap-2 here */}
            <div className="flex items-center gap-1 flex-shrink-0"> {/* Date */}
                <CalendarDays className="h-4 w-4" />
                {format(joke.dateAdded, 'PP')}
            </div>
            {isOwner && currentUser?.email && ( /* User info wrapper div */
                <div className="ml-2 flex-shrink-0"> {/* Added ml-2 for spacing, and flex-shrink-0 */}
                    <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-default"> {/* Removed flex-shrink-0 from here as parent has it */}
                            <UserCircle className="h-4 w-4" />
                            <span>You</span>
                        </div>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>Posted by: You ({currentUser.email})</p>
                        </TooltipContent>
                    </Tooltip>
                    </TooltipProvider>
                </div>
            )}
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-1">
            <StarRating
                rating={joke.funnyRate}
                onRatingChange={isOwner ? handleRatingChange : undefined}
                readOnly={!isOwner}
                size={16} 
                disabled={isRating || isTogglingUsed || !isOwner}
                starClassName={cn(isOwner ? "text-primary" : "text-muted-foreground")} 
            />
            {isOwner && isRating && <Loader2 className="ml-1 h-3 w-3 animate-spin text-primary" />}
            
            {isOwner && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleToggleUsed}
                      disabled={isTogglingUsed || isRating || !isOwner}
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
            )}

            {isOwner && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild disabled={isRating || isTogglingUsed || !isOwner}>
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
      </CardFooter>
    </Card>
  );
};

export default JokeListItem;

