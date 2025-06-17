
"use client";

import type { FC } from 'react';
import { format } from 'date-fns';
import { Check, Square, Loader2, UserCircle, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

import type { Joke } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StarRating from '@/components/StarRating';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface JokeListItemProps {
  joke: Joke;
}

const JokeListItem: FC<JokeListItemProps> = ({ joke }) => {
  const { toggleUsed } = useJokes();
  const { user: currentUser } = useAuth();
  const [isTogglingUsed, setIsTogglingUsed] = useState(false);

  const isOwner = currentUser?.uid === joke.userId;

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
      <Link href={`/joke/${joke.id}`}
            className="block flex-grow flex flex-col hover:bg-accent/20 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-t-lg">
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
      </Link>
      <CardFooter className="p-4 border-t border-border/50 flex items-center justify-between">
        {/* Left side: Date & Optional Owner Info */}
        <div className="flex items-center flex-nowrap text-xs text-muted-foreground">
            <div className="flex items-center gap-1 flex-shrink-0">
                <CalendarDays className="h-4 w-4 mr-1" />
                {format(joke.dateAdded, 'PP')}
            </div>
            {isOwner && currentUser?.email && (
                <div className="ml-2 flex-shrink-0">
                    <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-default">
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

        {/* Right side: Average Rating and Owner's Toggle Used */}
        <div className="flex items-center gap-2">
            {joke.ratingCount && joke.ratingCount > 0 ? (
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-default">
                                <StarRating
                                    rating={joke.averageRating || 0}
                                    readOnly
                                    size={14}
                                    starClassName="text-primary"
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Average rating: {(joke.averageRating || 0).toFixed(1)} from {joke.ratingCount} rating{joke.ratingCount === 1 ? '' : 's'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                <span className="text-xs text-muted-foreground italic">No ratings yet</span>
            )}

            {isOwner && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleToggleUsed}
                      disabled={isTogglingUsed}
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
        </div>
      </CardFooter>
    </Card>
  );
};

export default JokeListItem;
