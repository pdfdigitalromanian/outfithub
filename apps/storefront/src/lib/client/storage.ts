/** Safe localStorage helpers (private mode / disabled storage never throw). */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

const RECENT_KEY = "oh_recent"

export function pushRecentlyViewed(id: string, max = 12) {
  const list = readJson<string[]>(RECENT_KEY, []).filter((x) => x !== id)
  list.unshift(id)
  writeJson(RECENT_KEY, list.slice(0, max))
}

export const getRecentlyViewed = () => readJson<string[]>(RECENT_KEY, [])
