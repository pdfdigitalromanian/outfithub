/**
 * During `next build` the backend may be unreachable (CI); degrade to empty
 * data so the build succeeds. At runtime, rethrow so Next.js keeps serving the
 * last successfully rendered (ISR) page instead of caching empty/404 output.
 */
export const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build"

export function buildSafe<T>(fallback: T) {
  return (error: unknown): T => {
    if (IS_BUILD) return fallback
    throw error
  }
}
