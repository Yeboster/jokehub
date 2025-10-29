
import { NextRequest, NextResponse } from 'next/server';
import { explainJoke, ExplainJokeInputSchema } from '@/ai/flows/explain-joke-flow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedInput = ExplainJokeInputSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsedInput.error.format() }, { status: 400 });
    }

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
