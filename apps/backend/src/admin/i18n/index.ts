import ro from "./ro.json"
import "../styles.css"

// Apply the requested Romanian interface once per browser. Later language
// choices made in Medusa's profile settings remain respected.
if (typeof window !== "undefined") {
  try {
    if (!window.localStorage.getItem("oh-admin-language-v1")) {
      window.localStorage.setItem("lng", "ro")
      document.cookie = "lng=ro; Path=/; Max-Age=31536000; SameSite=Lax"
      window.localStorage.setItem("oh-admin-language-v1", "ro")
    }
  } catch {
    // Cookie detection also works when browser storage is unavailable.
    document.cookie = "lng=ro; Path=/; Max-Age=31536000; SameSite=Lax"
  }
}

// Medusa merges these additions into its bundled Romanian translation.
export default { ro: { translation: ro } }
