/**
 * Product alias matching for import flows.
 *
 * When a row comes in with a "raw_product_name" (from Excel), we need to match
 * it against products in the master (by canonical_name or registered aliases).
 *
 * The cache is rebuilt before each import commit to ensure newly-added aliases
 * take effect immediately.
 */

import { prisma } from '@/lib/prisma'

type AliasCacheEntry = {
  product: { id: string; canonical_name: string } | null
  confidence: number
}

let aliasCache: Map<string, AliasCacheEntry> | null = null

export function normaliseForMatching(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
}

export function clearAliasCache(): void {
  aliasCache = null
}

/**
 * Pre-load all products and aliases into memory for fast matching.
 * Call this before each import commit to ensure new aliases are picked up.
 */
export async function rebuildAliasCache(): Promise<void> {
  const products = await prisma.product.findMany({
    select: { id: true, canonical_name: true },
  })

  const aliases = await prisma.productAlias.findMany({
    select: { product_id: true, alias: true },
  })

  const cache = new Map<string, AliasCacheEntry>()

  // Register canonical names
  for (const product of products) {
    const normalised = normaliseForMatching(product.canonical_name)
    cache.set(normalised, { product, confidence: 1.0 })
  }

  // Register aliases
  for (const alias of aliases) {
    const normalised = normaliseForMatching(alias.alias)
    const existing = cache.get(normalised)
    // Exact match gets higher confidence
    cache.set(normalised, {
      product: { id: alias.product_id, canonical_name: '' },
      confidence: existing ? Math.max(existing.confidence, 0.95) : 0.95,
    })
  }

  aliasCache = cache
}

/**
 * Try to match a raw product name against the product master via aliases.
 *
 * Returns { product, confidence } where:
 *   - product is the matched Product (or null if no match)
 *   - confidence is a score 0–1 indicating how confident the match is
 */
export async function matchProductName(rawName: string): Promise<{
  product: { id: string } | null
  confidence: number
}> {
  if (!rawName) return { product: null, confidence: 0 }

  // Lazy-load cache on first use
  if (!aliasCache) {
    await rebuildAliasCache()
  }

  const normalised = normaliseForMatching(rawName)

  // Try exact normalized match first
  const exactMatch = aliasCache!.get(normalised)
  if (exactMatch && exactMatch.product) {
    return { product: exactMatch.product, confidence: exactMatch.confidence }
  }

  // Fall back to substring matching (for partial names)
  let bestMatch: AliasCacheEntry | null = null
  let bestMatchConfidence = 0

  for (const [key, entry] of aliasCache!.entries()) {
    if (!entry.product) continue

    // Substring matches get lower confidence
    if (normalised.includes(key) || key.includes(normalised)) {
      const confidence = 0.6
      if (confidence > bestMatchConfidence) {
        bestMatch = entry
        bestMatchConfidence = confidence
      }
    }
  }

  if (bestMatch && bestMatch.product) {
    return { product: bestMatch.product, confidence: bestMatchConfidence }
  }

  return { product: null, confidence: 0 }
}

/**
 * Register a new alias for a product (used during import conflict resolution).
 */
export async function addAlias(
  productId: string,
  alias: string
): Promise<void> {
  const normalised = normaliseForMatching(alias)

  await prisma.productAlias.upsert({
    where: { alias_clean: normalised },
    update: {},
    create: {
      product_id: productId,
      alias,
      alias_clean: normalised,
      source: 'import_resolution',
    },
  })

  // Invalidate cache so next match picks up the new alias
  clearAliasCache()
}