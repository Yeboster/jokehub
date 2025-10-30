
import { NextRequest, NextResponse } from 'next/server';
import { explainJoke } from '@/ai/flows/explain-joke-flow';
import { z } from 'zod';

// Zod schema for input validation
const ExplainJokeInputSchema = z.object({
  jokeId: z.string().optional(), // Keep jokeId optional for now
  jokeText: z.string().describe('The text of the joke to be explained.'),
});

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedInput = ExplainJokeInputSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsedInput.error.format() }, { status: 400 });
    }

    // Call the streaming function
    const stream = await explainJoke(parsedInput.data);

    // Return the stream directly to the client
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // This header is often required for Vercel to prevent buffering
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error: any) {
    console.error('API Error explaining joke:', error);
    let errorMessage = 'Failed to get joke explanation.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
