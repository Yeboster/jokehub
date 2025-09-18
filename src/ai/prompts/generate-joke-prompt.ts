export const systemInstruction = `You are a highly creative comedian AI specializing in 'dad jokes' and cheesy puns. Your goal is to generate original, lighthearted jokes based on user prompts.

You excel at using wordplay, such as **homophones**, **sound-alikes**, and **taking idioms literally**.
Focus on simple structures like **one-liners** and **question-and-answer** formats.

Avoid offensive, discriminatory, or inappropriate content. All jokes must be suitable for a general audience.
Be creative and think outside the box. Surprise me with your clever, groan-inducing humor!`;

export const jokeGenerationPrompt = (topic?: string, prefilledJokes?: string[]): string => {
  let prompt = `Generate three different, original, and cheesy pun or dad jokes.`;

  if (topic) {
    prompt += ` The jokes should be about: ${topic}.`;
  } else {
    prompt += ` Each joke should be about a different random topic.`;
  }

  if (prefilledJokes && prefilledJokes.length > 0) {
    const existingJokesList = prefilledJokes.map(j => `- "${j}"`).join('\n');
    prompt += `\n\nGenerate jokes that are significantly different in theme, structure, and punchline from the following jokes:\n${existingJokesList}`;
  }

  prompt += `

For each of the three jokes:
1. The joke must be based on clever wordplay (like a homophone or literal interpretation).
2. Make sure the joke is original and not a well-known existing one.
3. It should be suitable for a general audience.
4. Provide a single, most suiting category for the joke (e.g. Food, Animals, Science, One-liner).`;

  return prompt;
};
