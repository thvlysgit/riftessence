import React, { useEffect, useState } from 'react'

export default function StatusPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'
    fetch(`${api}/health`)
      .then((r) => r.json())
      .then((j) => setStatus(j?.status || 'unknown'))
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h1>API Status</h1>
      {error ? (
        <div style={{ color: 'red' }}>Error: {error}</div>
      ) : status ? (
        <div>Health: <strong>{status}</strong></div>
      ) : (
        <div>Checking...</div>
      )}
    </div>
  )
}
