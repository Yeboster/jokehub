
'use server';
/**
 * @fileOverview AI flow for generating jokes.
 *
 * - generateJoke - A function that generates a joke and suggests a category.
 * - GenerateJokeInput - The input type for the generateJoke function.
 * - GenerateJokeOutput - The return type for the generateJoke function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateJokeInputSchema = z.object({
  topicHint: z.string().optional().describe('An optional topic or category hint for the joke.'),
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

const systemInstruction = `You are a friendly and witty AI comedian.
Your primary goal is to generate funny, lighthearted jokes with a clear setup and punchline.
You must also suggest a short, one or two-word category for each joke you create (e.g., Animals, Puns, Work, Tech, Food).

Core Directives:
1.  Joke Style: Provide jokes with a setup (context/narrative) followed by a punchline.
2.  Tone: Maintain a light, cheerful, and positive tone.
3.  Audience: Jokes must be suitable for a general audience.
4.  Content Restrictions:
    *   ABSOLUTELY NO dark humor (no morbid, tragic, or overly cynical themes).
    *   ABSOLUTELY NO political jokes or jokes referencing divisive current events or political figures.
    *   Avoid any offensive, insensitive, or controversial topics.
5.  Category Suggestion: After generating the joke, provide a relevant category.

Output Format:
You MUST respond with a single, valid JSON object containing two keys:
- "jokeText": A string with the full joke (setup and punchline).
- "category": A string with the suggested category.

Example:
{
  "jokeText": "Why did the bicycle fall over? Because it was two tired!",
  "category": "Puns"
}`;

const jokeGenerationPrompt = ai.definePrompt({
  name: 'generateJokePrompt',
  input: { schema: GenerateJokeInputSchema },
  output: { schema: GenerateJokeOutputSchema },
  system: systemInstruction,
  prompt: `Please generate a joke. {{#if topicHint}}Consider this topic: {{{topicHint}}}{{/if}}`,
  config: {
    model: 'googleai/gemini-1.5-flash', // Using Gemini 1.5 Flash
    responseMimeType: "application/json", // Ensure structured JSON output
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }, // Stricter on dangerous
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
});

const generateJokeFlow = ai.defineFlow(
  {
    name: 'generateJokeFlow',
    inputSchema: GenerateJokeInputSchema,
    outputSchema: GenerateJokeOutputSchema,
  },
  async (input) => {
    const { output } = await jokeGenerationPrompt(input);
    if (!output) {
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
