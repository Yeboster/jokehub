
'use server';
/**
 * @fileOverview AI flow for generating jokes.
 *
 * - generateJoke - A function that generates a joke and suggests a category.
 * - GenerateJokeInput - The input type for the generateJoke function.
 * - GenerateJokeOutput - The return type for the generateJoke function.
 */

import { ai } from '@/ai/ai-instance';
import { jokeGenerationPrompt, systemInstruction } from '@/ai/prompts/generate-joke-prompt';
import { z } from 'genkit';

const GenerateJokeInputSchema = z.object({
  topicHint: z.string().optional().describe('An optional topic or category hint for the joke.'),
  prefilledJoke: z.string().optional().describe('A prefilled joke to ensure the generated joke is different.'),
});

export type GenerateJokeInput = z.infer<typeof GenerateJokeInputSchema>;

const GenerateJokeOutputSchema = z.object({
  jokeText: z.string().describe('The generated joke, including setup and punchline.'),
  category: z.string().describe('A suggested category for the joke (e.g., Animals, Puns, Work).'),
});
export type GenerateJokeOutput = z.infer<typeof GenerateJokeOutputSchema>;

export async function generateJoke(input: GenerateJokeInput): Promise<GenerateJokeOutput> {
  return generateJokeFlow(input);
}

const generateJokeFlow = ai.defineFlow(
  {
    name: 'generateJokeFlow',
    inputSchema: GenerateJokeInputSchema,
    outputSchema: GenerateJokeOutputSchema,
  },
  async (input) => {
    const prompt = jokeGenerationPrompt(input.topicHint, input.prefilledJoke);

    const res = await ai.generate({
      prompt,
      system: systemInstruction,
      output: { schema: GenerateJokeOutputSchema }
    });
    console.error(res)
    const output = res.output;
    if (!output || typeof output !== 'object') {
      throw new Error('AI failed to generate a joke. The output was empty.');
    }
    // Validate the output against the schema to be sure
    const parsedOutput = GenerateJokeOutputSchema.safeParse(output);
    if (!parsedOutput.success) {
        console.error("AI output validation error:", parsedOutput.error);
        throw new Error('AI returned data in an unexpected format.');
    }
    return parsedOutput.data;
  }
);
