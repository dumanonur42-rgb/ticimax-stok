export async function attemptAll(steps: (() => unknown | Promise<unknown>)[]): Promise<void> {
  const errors: unknown[] = []
  for (const step of steps) {
    try {
      await step()
    } catch (error) {
      errors.push(error)
    }
  }
  if (errors.length) throw errors[0]
}
