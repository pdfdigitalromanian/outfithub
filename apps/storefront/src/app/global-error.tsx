"use client"

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ro">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f3ee", color: "#161513", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontWeight: 400, fontSize: 40 }}>Magazinul nu răspunde momentan</h1>
          <p style={{ color: "#6c675f" }}>Încearcă din nou în câteva momente.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#161513", color: "#f6f3ee", cursor: "pointer" }}>
            Reîncearcă
          </button>
        </div>
      </body>
    </html>
  )
}
