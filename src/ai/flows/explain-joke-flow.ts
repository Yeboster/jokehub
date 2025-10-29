
'use server';
/**
 * @fileOverview AI flow for explaining a joke.
 *
 * - explainJokeStream - A function that generates and streams an explanation for a given joke.
 * - ExplainJokeInput - The input type for the explainJokeStream function.
 */
import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

export const ExplainJokeInputSchema = z.object({
  jokeText: z.string().describe('The text of the joke to be explained.'),
});
export type ExplainJokeInput = z.infer<typeof ExplainJokeInputSchema>;

const systemInstruction = `You are a senior comedian trying to explain the jokes to the audience. Your tone should be insightful, a bit world-weary but still passionate about the craft of comedy.

Break down the joke's structure, identify the pun or the source of the humor, and explain why it works (or why it's a "groaner"). Keep the explanation concise, like a quick, witty aside during a comedy show. Do not just repeat the joke. Start directly with the explanation.`;

export async function explainJokeStream(input: ExplainJokeInput): Promise<ReadableStream<string>> {
  const { stream } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    system: systemInstruction,
    prompt: `Explain this joke: "${input.jokeText}"`,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });

  return readableStream;
}
