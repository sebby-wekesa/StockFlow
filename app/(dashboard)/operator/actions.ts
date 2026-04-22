'use server'

export async function fetchStock() {
  // Mock data
  return [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ]
}