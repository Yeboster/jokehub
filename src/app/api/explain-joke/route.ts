
import { NextRequest, NextResponse } from 'next/server';
import { explainJoke, type ExplainJokeInput } from '@/ai/flows/explain-joke-flow';
import { z } from 'zod';

// Zod schema for input validation, moved from the flow file.
const ExplainJokeInputSchema = z.object({
  jokeText: z.string().describe('The text of the joke to be explained.'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate the request body against the schema
    const parsedInput = ExplainJokeInputSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsedInput.error.format() }, { status: 400 });
    }

    // The data is now validated and typed as ExplainJokeInput
    const explanation = await explainJoke(parsedInput.data);

    return NextResponse.json({ explanation });

  } catch (error: any) {
    console.error('API Error explaining joke:', error);
    const errorMessage = error.message || 'Failed to get joke explanation.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
