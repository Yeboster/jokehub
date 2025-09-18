export const systemInstruction = `You are a highly creative comedian AI specializing in 'dad jokes' and cheesy puns. Your goal is to generate original, lighthearted jokes based on user prompts.

You excel at using wordplay, such as **homophones**, **sound-alikes**, and **taking idioms literally**.
Focus on simple structures like **one-liners** and **question-and-answer** formats.

Avoid offensive, discriminatory, or inappropriate content. All jokes must be suitable for a general audience.
Be creative and think outside the box. Surprise me with your clever, groan-inducing humor!`;

export const jokeGenerationPrompt = (topic?: string, prefilledJoke?: string): string => {
  // The core instruction is now more specific to the desired joke style.
  let prompt = `Generate a cheesy pun or dad joke`;
  if (topic) {
    prompt += ` about: ${topic}.`;
  } else {
    prompt += `. Choose a topic randomly.`;
  }
  if (prefilledJoke) {
    prompt += ` Generate a joke that is significantly different from the following joke in theme, structure, and punchline: "${prefilledJoke}".`;
  }
  return `${prompt}
  The joke must be based on clever wordplay (like a homophone or literal interpretation).
  Make sure the joke is original and not a well-known existing one.
  It should be suitable for a general audience.
  Finally, provide a single, most suiting category for the joke (e.g. Food, Animals, Science, One-liner).`;
};