export function sanitizeRelativeRedirect(input: string | null | undefined, fallback = '/dashboard'): string {
  if (typeof input !== 'string') return fallback

  const value = input.trim()
  if (!value) return fallback

  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.includes('\n') || value.includes('\r')) return fallback

  return value
}
