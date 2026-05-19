import React, { useEffect, useState } from 'react'

export default function App(){
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/health').then(async r => {
      if (!r.ok) throw new Error('API not OK')
      const data = await r.json()
      setHealth(data)
    }).catch(err => setError(err.message))
  }, [])

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif' }}>
      <h1>Todo (React + Express)</h1>
      <p>Backend health: {health ? 'OK' : '…'}</p>
      {error && <pre style={{ color: 'crimson' }}>{error}</pre>}

      <form onSubmit={e=>e.preventDefault()}>
        <input placeholder="New todo..." />
        <button disabled>Add</button>
      </form>

      <p>This is a starter scaffold. Wire up endpoints like /api/todos next.</p>
    </div>
  )
}
