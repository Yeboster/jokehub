"use client";

import type { FC } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (newRating: number) => void;
  maxStars?: number;
  size?: number;
  className?: string;
  starClassName?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const StarRating: FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  maxStars = 5,
  size = 20,
  className,
  starClassName,
  disabled = false,
  readOnly = false,
}) => {
  const handleStarClick = (index: number) => {
    if (!readOnly && onRatingChange && !disabled) {
      onRatingChange(index + 1);
    }
  };

  const starElements = [];
  for (let i = 0; i < maxStars; i++) {
    const isFilled = i < rating;
    starElements.push(
      <Button
        key={i}
        type="button" // ensure it does not submit forms if nested
        variant="ghost"
        size="icon"
        className={cn(
          'p-0 h-auto w-auto', // remove default button padding and size constraints
          !readOnly && !disabled ? 'cursor-pointer' : 'cursor-default',
          starClassName
        )}
        onClick={() => handleStarClick(i)}
        disabled={disabled || readOnly}
        aria-label={readOnly ? `${isFilled ? 'Filled' : 'Empty'} star ${i + 1} of ${maxStars}` : `Set rating to ${i + 1} stars`}
      >
        <Star
          size={size}
          fill={isFilled ? 'currentColor' : 'none'}
          className={cn(isFilled ? 'text-accent' : 'text-muted-foreground', starClassName)}
        />
      </Button>
    );
  }

  return <div className={cn('flex items-center space-x-0.5', className)}>{starElements}</div>;
};

export default StarRating;
