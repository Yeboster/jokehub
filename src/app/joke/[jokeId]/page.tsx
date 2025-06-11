
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2, ArrowLeft, ShieldAlert, CalendarDays, Tag, Star as StarIcon, Check, MessageSquare, Send, Users } from 'lucide-react';

import type { Joke, UserRating } from '@/lib/types';
import { useJokes } from '@/contexts/JokeContext';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/header';
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
  const [isLoadingRating, setIsLoadingRating] = useState<boolean>(true);

  // Other Users' Ratings State
  const [otherUserRatings, setOtherUserRatings] = useState<UserRating[]>([]);
  const [isLoadingOtherRatings, setIsLoadingOtherRatings] = useState<boolean>(true);

  const jokeId = Array.isArray(params.jokeId) ? params.jokeId[0] : params.jokeId;

  useEffect(() => {
    async function fetchJokeAndRatings() {
      if (!jokeId) {
        setError("Joke ID is missing.");
        setIsLoading(false);
        setIsLoadingRating(false);
        setIsLoadingOtherRatings(false);
        return;
      }
      setIsLoading(true);
      setIsLoadingRating(true);
      setIsLoadingOtherRatings(true);
      setError(null);

      try {
        const fetchedJoke = await getJokeById(jokeId);
        if (fetchedJoke) {
          setJoke(fetchedJoke);

          let userRating: UserRating | null = null;
          if (user) {
            userRating = await getUserRatingForJoke(jokeId);
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
          setIsLoadingRating(false);

          // Fetch all ratings and filter out the current user's
          const allRatings = await fetchAllRatingsForJoke(jokeId);
          setOtherUserRatings(allRatings.filter(rating => rating.userId !== user?.uid));
          setIsLoadingOtherRatings(false);

        } else {
          setError("Joke not found. It might have been deleted or the ID is incorrect.");
          setIsLoadingRating(false);
          setIsLoadingOtherRatings(false);
        }
      } catch (err) {
        console.error("Error fetching joke or ratings:", err);
        setError("Failed to load the joke or ratings. Please try again later.");
        setIsLoadingRating(false);
        setIsLoadingOtherRatings(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (!loadingContext && !authLoading && jokeId) {
      fetchJokeAndRatings();
    } else if (!jokeId && !loadingContext && !authLoading) {
      setError("Joke ID is missing.");
      setIsLoading(false);
      setIsLoadingRating(false);
      setIsLoadingOtherRatings(false);
    }
  }, [jokeId, user, getJokeById, getUserRatingForJoke, fetchAllRatingsForJoke, loadingContext, authLoading]);


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
      const updatedRating = await getUserRatingForJoke(joke.id);
       if (updatedRating) {
         setCurrentUserRating(updatedRating);
         setRatingInputValue(updatedRating.ratingValue);
         setCommentInputValue(updatedRating.comment || '');
       }
      toast({ title: 'Success', description: currentUserRating ? 'Your rating has been updated.' : 'Your rating has been submitted.' });
      
      // Refetch all ratings to update community feedback section
      const allRatings = await fetchAllRatingsForJoke(joke.id);
      setOtherUserRatings(allRatings.filter(rating => rating.userId !== user?.uid));

    } catch (err) {
      console.error("Error submitting rating from page:", err);
      toast({ title: 'Rating Submission Error', description: 'Could not submit your rating.', variant: 'destructive'});
    } finally {
      setIsSubmittingRating(false);
    }
  };


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
      <div className="container mx-auto p-4 md:p-8">
        <Header title="Joke Not Available" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive flex items-center">
              <ShieldAlert className="mr-2 h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/jokes')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jokes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!joke) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Header title="Joke Not Found" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Hmm...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">We couldn't find the joke you're looking for.</p>
            <Button variant="outline" onClick={() => router.push('/jokes')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jokes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = user && joke.userId === user.uid;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
            <Button variant="outline" size="sm" onClick={() => router.push('/jokes')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Jokes
            </Button>
        </div>

        <Card className="shadow-xl overflow-hidden mb-8">
          <CardHeader className="bg-muted/30 p-6">
            <CardTitle className="text-2xl md:text-3xl text-primary font-semibold">
              A Chuckle For You!
            </CardTitle>
             {isOwner && (
                <CardDescription>This is one of your curated jokes.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <p className="text-lg md:text-xl text-foreground leading-relaxed whitespace-pre-line mb-8">
              {joke.text}
            </p>

            <div className="space-y-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Tag className="mr-2 h-4 w-4 text-primary" />
                Category: <Badge variant="secondary" className="ml-2 bg-accent text-accent-foreground">{joke.category}</Badge>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                Date Added: {format(joke.dateAdded, 'MMMM d, yyyy')}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <StarIcon className="mr-2 h-4 w-4 text-primary" />
                Owner's Rating: 
                {joke.funnyRate > 0 ? (
                    <StarRating rating={joke.funnyRate} readOnly={true} size={18} className="ml-2" starClassName="text-primary" />
                ) : (
                    <span className="ml-1 italic">Unrated by owner</span>
                )}
              </div>
               {joke.used && isOwner && (
                <div className="flex items-center text-sm text-green-600">
                  <Check className="mr-2 h-4 w-4" />
                  You've marked this joke as used.
                </div>
              )}
            </div>
          </CardContent>
          {isOwner && (
            <CardFooter className="bg-muted/20 p-6 flex justify-end">
              <Button onClick={() => router.push(`/edit-joke/${joke.id}`)}>
                Edit This Joke
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* User Rating Section */}
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-primary"/> 
                {currentUserRating ? 'Update Your Rating' : 'Rate This Joke'}
            </CardTitle>
            {!user && <CardDescription>Please <Link href={`/auth?redirect=/joke/${joke.id}`} className="underline text-primary hover:text-primary/80">log in or sign up</Link> to rate this joke.</CardDescription>}
          </CardHeader>
          {user && (
            <CardContent>
              {isLoadingRating ? (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading your rating...</span>
                </div>
              ) : (
                <form onSubmit={handleRatingSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="user-rating-stars" className="block text-sm font-medium text-foreground mb-1">Your Rating (1-5 Stars)</Label>
                    <StarRating
                      rating={ratingInputValue}
                      onRatingChange={(newRate) => setRatingInputValue(newRate)}
                      maxStars={5}
                      size={28}
                      disabled={isSubmittingRating}
                      starClassName="text-primary hover:text-primary/70"
                      className="mb-1"
                    />
                     {ratingInputValue === 0 && <p className="text-xs text-muted-foreground">Click a star to rate.</p>}
                  </div>
                  <div>
                    <Label htmlFor="user-rating-comment" className="block text-sm font-medium text-foreground mb-1">Your Comment (Optional)</Label>
                    <Textarea
                      id="user-rating-comment"
                      placeholder="What did you think of this joke?"
                      value={commentInputValue}
                      onChange={(e) => setCommentInputValue(e.target.value)}
                      disabled={isSubmittingRating}
                      maxLength={1000}
                      rows={3}
                      className="max-w-xl"
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

        {/* Community Feedback Section */}
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Community Feedback
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoadingOtherRatings ? (
                    <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading community ratings...</span>
                    </div>
                ) : otherUserRatings.length === 0 ? (
                    <p className="text-muted-foreground">No other community feedback yet. Be the first to share your thoughts after rating!</p>
                ) : (
                    <div className="space-y-6">
                        {otherUserRatings.map((rating, index) => (
                            <div key={rating.id}>
                                <StarRating rating={rating.ratingValue} readOnly size={20} starClassName="text-primary" />
                                {rating.comment && (
                                    <p className="mt-2 text-sm text-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{rating.comment}</p>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Rated on: {format(rating.updatedAt, 'MMMM d, yyyy')}
                                </p>
                                {index < otherUserRatings.length - 1 && <Separator className="my-4" />}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
    
