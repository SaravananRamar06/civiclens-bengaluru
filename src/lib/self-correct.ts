/**
 * Runs attempts in order until one gives a usable answer. A failed attempt or a
 * rejected answer becomes a note for the next attempt, so it can correct itself.
 */
export async function firstUsable<T>(
  attempts: ((note?: string) => Promise<T>)[],
  review: (answer: T) => string | null,
) {
  let note: string | undefined;
  let failure: unknown;
  for (let index = 0; index < attempts.length; index++) {
    try {
      const answer = await attempts[index](note);
      const problem = review(answer);
      if (!problem) return { answer, tries: index + 1 };
      note = problem;
      failure = new Error(problem);
    } catch (error) {
      failure = error;
      note = undefined;
    }
  }
  throw failure;
}
