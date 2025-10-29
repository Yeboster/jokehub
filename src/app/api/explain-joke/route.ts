
import { NextRequest, NextResponse } from 'next/server';
import { explainJokeStream, ExplainJokeInputSchema } from '@/ai/flows/explain-joke-flow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedInput = ExplainJokeInputSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsedInput.error.format() }, { status: 400 });
    }

    // Call the streaming function and return the response directly
    const jokeStream = await explainJokeStream(parsedInput.data);

    return new Response(jokeStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error('API Error explaining joke:', error);
    // Ensure a clear error message is sent back to the client
    return NextResponse.json(
      { error: error.message || 'Failed to get joke explanation.' },
      { status: 500 }
    );
  }
}
