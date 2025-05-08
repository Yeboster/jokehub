
"use client";

import type { FC } from 'react';
import type { Joke } from '@/lib/types';
import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import JokeListItem from './joke-list-item';

interface JokeListProps {
  jokes: Joke[];
  // onToggleUsed is no longer needed here
}

const JokeList: FC<JokeListProps> = ({ jokes }) => {
  if (jokes.length === 0) {
    return <p className="text-muted-foreground">No jokes found. Add some or try different filters!</p>;
  }

  return (
    <Table>
      <TableCaption>A list of your jokes.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">Joke</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Date Added</TableHead>
          <TableHead className="text-center">Used</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jokes.map((joke) => (
          <JokeListItem key={joke.id} joke={joke} />
        ))}
      </TableBody>
    </Table>
  );
};

export default JokeList;
