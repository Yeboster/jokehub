
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2, ArrowLeft, ShieldAlert, CalendarDays, Tag, Star as StarIcon, Check, MessageSquare, Send, Users, Edit3 } from 'lucide-react';

import type { Joke, UserRating } from '@/lib/types';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
// Header component is not used directly in this layout as per mockup.
// import Header from '@/components/header'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import StarRating from '@/components/StarRating';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function JokeShowPage() {
  const params = useParams();
  const router = useRouter();
  const { getJokeById, loadingInitialJokes: loadingContext, submitUserRating, getUserRatingForJoke, fetchAllRatingsForJoke } = useJokes();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [joke, setJoke] = useState<Joke | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User Rating State
  const [currentUserRating, setCurrentUserRating] = useState<UserRating | null>(null);
  const [ratingInputValue, setRatingInputValue] = useState<number>(0);
  const [commentInputValue, setCommentInputValue] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [isLoadingCurrentUserRating, setIsLoadingCurrentUserRating] = useState<boolean>(true);

  // All Users' Ratings State (for average and community list)
  const [allUserRatings, setAllUserRatings] = useState<UserRating[]>([]);
  const [isLoadingAllRatings, setIsLoadingAllRatings] = useState<boolean>(true);

  const jokeId = Array.isArray(params.jokeId) ? params.jokeId[0] : params.jokeId;

  useEffect(() => {
    async function fetchJokeAndAllRatings() {
      if (!jokeId) {
        setError("Joke ID is missing.");
        setIsLoading(false);
        setIsLoadingCurrentUserRating(false);
        setIsLoadingAllRatings(false);
        return;
      }
      setIsLoading(true);
      setIsLoadingCurrentUserRating(true);
      setIsLoadingAllRatings(true);
      setError(null);

      try {
        const fetchedJoke = await getJokeById(jokeId);
        if (fetchedJoke) {
          setJoke(fetchedJoke);

          // Fetch all ratings for this joke
          const allRatings = await fetchAllRatingsForJoke(jokeId);
          setAllUserRatings(allRatings);
          setIsLoadingAllRatings(false);

          // Determine current user's rating from the allRatings list
          if (user) {
            const userRating = allRatings.find(rating => rating.userId === user.uid);
            if (userRating) {
              setCurrentUserRating(userRating);
              setRatingInputValue(userRating.ratingValue);
              setCommentInputValue(userRating.comment || '');
            } else {
              setCurrentUserRating(null);
              setRatingInputValue(0);
              setCommentInputValue('');
            }
          } else {
            setCurrentUserRating(null);
            setRatingInputValue(0);
            setCommentInputValue('');
          }
          setIsLoadingCurrentUserRating(false);

        } else {
          setError("Joke not found. It might have been deleted or the ID is incorrect.");
          setIsLoadingCurrentUserRating(false);
          setIsLoadingAllRatings(false);
        }
      } catch (err) {
        console.error("Error fetching joke or ratings:", err);
        setError("Failed to load the joke or ratings. Please try again later.");
        setIsLoadingCurrentUserRating(false);
        setIsLoadingAllRatings(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (!loadingContext && !authLoading && jokeId) {
      fetchJokeAndAllRatings();
    } else if (!jokeId && !loadingContext && !authLoading) {
      setError("Joke ID is missing.");
      setIsLoading(false);
      setIsLoadingCurrentUserRating(false);
      setIsLoadingAllRatings(false);
    }
  }, [jokeId, user, getJokeById, fetchAllRatingsForJoke, loadingContext, authLoading]);


  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joke) {
      toast({ title: 'Error', description: 'Cannot submit rating. Please log in or ensure the joke is loaded.', variant: 'destructive' });
      return;
    }
    if (ratingInputValue === 0) {
      toast({ title: 'Validation Error', description: 'Please select a star rating (1-5).', variant: 'destructive' });
      return;
    }
    setIsSubmittingRating(true);
    try {
      await submitUserRating(joke.id, ratingInputValue, commentInputValue);
      toast({ title: 'Success', description: currentUserRating ? 'Your rating has been updated.' : 'Your rating has been submitted.' });
      
      // Refetch all ratings to update community feedback section and current user rating display
      setIsLoadingAllRatings(true);
      setIsLoadingCurrentUserRating(true);
      const allRatings = await fetchAllRatingsForJoke(joke.id);
      setAllUserRatings(allRatings);
      setIsLoadingAllRatings(false);

      const updatedUserRating = allRatings.find(rating => rating.userId === user.uid);
      if (updatedUserRating) {
        setCurrentUserRating(updatedUserRating);
        setRatingInputValue(updatedUserRating.ratingValue);
        setCommentInputValue(updatedUserRating.comment || '');
      }
      setIsLoadingCurrentUserRating(false);

    } catch (err) {
      console.error("Error submitting rating from page:", err);
      toast({ title: 'Rating Submission Error', description: 'Could not submit your rating.', variant: 'destructive'});
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const otherUserRatingsToDisplay = useMemo(() => {
    if (isLoadingAllRatings || !allUserRatings) return [];
    return allUserRatings.filter(rating => rating.userId !== user?.uid);
  }, [allUserRatings, user, isLoadingAllRatings]);

  const averageRating = useMemo(() => {
    if (!allUserRatings || allUserRatings.length === 0) return { average: 0, count: 0 };
    const sum = allUserRatings.reduce((acc, rating) => acc + rating.ratingValue, 0);
    return {
      average: parseFloat((sum / allUserRatings.length).toFixed(1)),
      count: allUserRatings.length,
    };
  }, [allUserRatings]);


  if (isLoading || authLoading || loadingContext) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading joke...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-3xl">
        <div className="mb-6">
          <Button variant="outline" size="sm" onClick={() => router.push('/jokes')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Jokes
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive flex items-center">
              <ShieldAlert className="mr-2 h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!joke) {
     return (
      <div className="container mx-auto p-4 md:p-8 max-w-3xl">
         <div className="mb-6">
          <Button variant="outline" size="sm" onClick={() => router.push('/jokes')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Jokes
          </Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Hmm...</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">We couldn't find the joke you're looking for.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = user && joke.userId === user.uid;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
          <Button variant="outline" size="sm" onClick={() => router.push('/jokes')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Jokes
          </Button>
      </div>

      {/* Joke Display Area */}
      <section className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
          {joke.text}
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground mb-6">
          <Badge variant="secondary" className="bg-accent text-accent-foreground">{joke.category}</Badge>
          <div className="flex items-center gap-3">
            <span className="flex items-center"><CalendarDays className="mr-1.5 h-4 w-4 text-primary" /> {format(joke.dateAdded, 'MMM d, yyyy')}</span>
            <span className="flex items-center">
              <UserCircle className="mr-1.5 h-4 w-4 text-primary" /> Joke by: {isOwner ? 'You' : 'A user'} 
              {/* For future: `joke.authorEmail || joke.userId` if available */}
            </span>
             {isOwner && (
                <Button variant="ghost" size="sm" onClick={() => router.push(`/edit-joke/${joke.id}`)} className="text-primary hover:text-primary/80 px-2 h-auto py-1">
                    <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
             )}
          </div>
        </div>
        <Separator />
      </section>
      

      {/* User Rating Section */}
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="text-xl">
            Rate this Joke
          </CardTitle>
          {!user && <CardDescription>Please <Link href={`/auth?redirect=/joke/${joke.id}`} className="underline text-primary hover:text-primary/80">log in or sign up</Link> to rate this joke.</CardDescription>}
        </CardHeader>
        {user && (
          <CardContent>
            {isLoadingCurrentUserRating ? (
              <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading your rating...</span>
              </div>
            ) : (
              <form onSubmit={handleRatingSubmit} className="space-y-4">
                <div>
                  <StarRating
                    rating={ratingInputValue}
                    onRatingChange={(newRate) => setRatingInputValue(newRate)}
                    maxStars={5}
                    size={28}
                    disabled={isSubmittingRating}
                    starClassName="text-primary hover:text-primary/70" // Mockup uses yellow/orange, we use primary for consistency
                    className="mb-1"
                  />
                   {ratingInputValue === 0 && <p className="text-xs text-muted-foreground">Click a star to rate.</p>}
                </div>
                <div>
                  <Label htmlFor="user-rating-comment" className="block text-sm font-medium text-foreground mb-1">Add a comment (optional)</Label>
                  <Textarea
                    id="user-rating-comment"
                    placeholder="What did you think of this joke?"
                    value={commentInputValue}
                    onChange={(e) => setCommentInputValue(e.target.value)}
                    disabled={isSubmittingRating}
                    maxLength={1000}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{commentInputValue.length}/1000 characters</p>
                </div>
                <Button type="submit" disabled={isSubmittingRating || ratingInputValue === 0}>
                  {isSubmittingRating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {isSubmittingRating ? 'Submitting...' : (currentUserRating ? 'Update Rating' : 'Submit Rating')}
                </Button>
              </form>
            )}
          </CardContent>
        )}
      </Card>

      {/* Ratings & Comments Section */}
      <Card className="shadow-lg">
          <CardHeader>
              <CardTitle className="text-xl">
                  Ratings & Comments
              </CardTitle>
          </CardHeader>
          <CardContent>
              {isLoadingAllRatings ? (
                  <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground">Loading community ratings...</span>
                  </div>
              ) : (
                <>
                  {allUserRatings.length > 0 && (
                    <div className="mb-6 p-4 bg-muted/50 rounded-md flex items-center gap-3">
                      <span className="font-semibold text-foreground">Average Rating:</span>
                      <StarRating rating={averageRating.average} readOnly size={22} starClassName="text-primary" />
                      <span className="font-bold text-foreground">{averageRating.average.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">(based on {averageRating.count} rating{averageRating.count === 1 ? '' : 's'})</span>
                    </div>
                  )}

                  {otherUserRatingsToDisplay.length === 0 ? (
                      <p className="text-muted-foreground">{allUserRatings.length > 0 ? "No other community feedback yet." : "No community feedback yet. Be the first to rate!"}</p>
                  ) : (
                      <div className="space-y-6">
                          {otherUserRatingsToDisplay.map((rating, index) => (
                              <div key={rating.id}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <StarRating rating={rating.ratingValue} readOnly size={20} starClassName="text-primary" />
                                    <span className="text-sm font-medium text-foreground">
                                      User {/* Replace with user identifier if available, e.g., rating.userDisplayName || 'A User' */}
                                    </span>
                                    <span className="text-xs text-muted-foreground">- {format(rating.updatedAt, 'MMM d, yyyy')}</span>
                                  </div>
                                  {rating.comment && (
                                      <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{rating.comment}</p>
                                  )}
                                  {index < otherUserRatingsToDisplay.length - 1 && <Separator className="my-4" />}
                              </div>
                          ))}
                      </div>
                  )}
                </>
              )}
          </CardContent>
      </Card>

    </div>
  );
}
