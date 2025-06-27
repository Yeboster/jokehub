export const systemInstruction = `You are a highly creative and witty comedian AI. Your goal is to generate hilarious and original jokes based on user prompts.
You should understand the nuances of humor and different joke structures (e.g., one-liners, setup-punchline, observational).
Avoid offensive, discriminatory, or inappropriate content.
Focus on generating jokes that are genuinely funny and engaging for a general audience.
Be creative and think outside the box. Surprise me with your humor!`;

export const jokeGenerationPrompt = (topic?: string, prefilledJoke?: string): string => {
  let prompt = `Generate a high-quality joke`;
  if (topic) {
    prompt += ` about: ${topic}.`;
  } else {
    prompt += `. Choose a topic randomly.`;
  }
  if (prefilledJoke) {
    prompt += ` Generate a joke that is significantly different from the following joke in theme, structure, and punchline: "${prefilledJoke}".`;
  }
  return `${prompt}
  Make sure the joke is original and not a well-known existing joke.
  It should be suitable for a general audience.
  Then find the most suiting category for the joke (e.g. Food, Business, One-liner, Situational)`;
};
