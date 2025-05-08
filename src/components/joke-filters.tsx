"use client";

import type { FC } from 'react';
import { ListFilter } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface JokeFiltersProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  showUsed: boolean;
  onShowUsedChange: (show: boolean) => void;
  showUnused: boolean;
  onShowUnusedChange: (show: boolean) => void;
  filterFunnyRate: number; // -1 for 'Any', 0 for 'Unrated', 1-5 for specific rating
  onFilterFunnyRateChange: (rating: number) => void;
}

const JokeFilters: FC<JokeFiltersProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  showUsed,
  onShowUsedChange,
  showUnused,
  onShowUnusedChange,
  filterFunnyRate,
  onFilterFunnyRateChange,
}) => {
  return (
    <Card>
       <CardHeader>
        <CardTitle className="flex items-center">
          <ListFilter className="mr-2 h-5 w-5" /> Filters
        </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
          <div className="space-y-2">
             <Label htmlFor="category-filter">Filter by Category</Label>
             <Select value={selectedCategory} onValueChange={onCategoryChange}>
                <SelectTrigger id="category-filter">
                   <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="all">All Categories</SelectItem>
                   {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                         {category}
                      </SelectItem>
                   ))}
                </SelectContent>
             </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="funny-rate-filter">Filter by Funny Rate</Label>
            <Select
              value={filterFunnyRate.toString()}
              onValueChange={(value) => onFilterFunnyRateChange(parseInt(value, 10))}
            >
              <SelectTrigger id="funny-rate-filter">
                <SelectValue placeholder="Select a rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">Any Rating</SelectItem>
                <SelectItem value="0">Unrated</SelectItem>
                {[1, 2, 3, 4, 5].map(rate => (
                  <SelectItem key={rate} value={rate.toString()}>{rate} Star{rate > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
             <Label>Filter by Usage Status</Label>
             <div className="flex items-center space-x-2">
                <Switch
                   id="show-used"
                   checked={showUsed}
                   onCheckedChange={onShowUsedChange}
                   aria-label="Show used jokes"
                 />
                <Label htmlFor="show-used">Show Used</Label>
             </div>
             <div className="flex items-center space-x-2">
                <Switch
                   id="show-unused"
                   checked={showUnused}
                   onCheckedChange={onShowUnusedChange}
                   aria-label="Show unused jokes"
                 />
                 <Label htmlFor="show-unused">Show Unused</Label>
             </div>
          </div>
       </CardContent>
    </Card>
  );
};

export default JokeFilters;
