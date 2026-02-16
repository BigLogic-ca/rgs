import { render, act, screen } from '@testing-library/react'
import { describe, test, expect, beforeEach } from '@jest/globals'
import '../../../index'
import React from 'react'

const Counter = ({ stateKey }: { stateKey: string }) => {
  const [val, setVal] = useGState(stateKey)
  return (
    <div>
      <span data-testid={stateKey}>{val === null ? 'null' : val.toString()}</span>
      <button onClick={() => setVal((prev: any) => (prev || 0) + 1)}>Increment</button>
    </div>
  )
}

describe('gState Enterprise Implementation', () => {
  beforeEach(() => {
    localStorage.clear()
    destroyState()
    initState({ debounceTime: 0 })
  })

  test('should handle reactive updates via useGState', () => {
    render(<Counter stateKey="count" />)
    const element = screen.getByTestId('count')

    expect(element.textContent).toBe('null')

    act(() => {
      gState.set('count', 42)
    })
    expect(element.textContent).toBe('42')
  })

  test('should persist values with metadata', async () => {
    act(() => {
      gState.set('theme', 'dark', { persist: true })
    })

    // Wait for debounce
    await new Promise(r => setTimeout(r, 10))

    const raw = localStorage.getItem('gstate_theme')
    expect(raw).not.toBeNull()
    const meta = JSON.parse(raw!)
    expect(meta.d).toBe('dark')
    expect(meta).toHaveProperty('v')
  })

  test('should maintain granular reactivity', () => {
    render(
      <>
        <Counter stateKey="a" />
        <Counter stateKey="b" />
      </>
    )

    act(() => {
      gState.set('a', 'changed')
    })

    expect(screen.getByTestId('a').textContent).toBe('changed')
    expect(screen.getByTestId('b').textContent).toBe('null')
  })
})
