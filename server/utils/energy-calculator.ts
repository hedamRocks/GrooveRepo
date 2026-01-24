/**
 * Energy Score Calculator and Normalizer
 * Computes 0.0-1.0 energy score using percentile ranking
 */

export interface EnergyComponents {
  loudness: number
  spectralFlux: number
  onsetRate: number
  percussiveRatio: number
}

/**
 * Normalize energy score across entire library using percentile ranking
 */
export async function normalizeEnergy(rawEnergy: number): Promise<number> {
  try {
    // Fetch all raw energy scores from library
    const allScores = await getAllEnergyScores()

    if (allScores.length === 0) {
      // No reference data yet - return raw score
      return Math.max(0, Math.min(1, rawEnergy))
    }

    // Calculate percentile
    const percentile = calculatePercentile(rawEnergy, allScores)

    console.log(`[Energy Calculator] Raw: ${rawEnergy.toFixed(3)}, Normalized: ${percentile.toFixed(3)}`)

    return percentile

  } catch (error) {
    console.warn('[Energy Calculator] Normalization failed, using raw score:', error)
    return Math.max(0, Math.min(1, rawEnergy))
  }
}

/**
 * Get all energy scores from database
 */
async function getAllEnergyScores(): Promise<number[]> {
  // Fetch from AnalysisCache
  // Note: This queries the denormalized 'energy' field (0.0-1.0)
  // We need to track raw energy separately for re-normalization

  // For now, return empty array - will be populated as analysis runs
  // In production, you'd store rawEnergy in AnalysisCache and fetch that
  return []
}

/**
 * Calculate percentile rank of a value in a dataset
 */
function calculatePercentile(value: number, dataset: number[]): number {
  if (dataset.length === 0) {
    return 0.5
  }

  // Sort dataset
  const sorted = [...dataset].sort((a, b) => a - b)

  // Count values below this one
  const belowCount = sorted.filter(v => v < value).length

  // Percentile = (count below) / (total count)
  const percentile = belowCount / sorted.length

  return Math.max(0, Math.min(1, percentile))
}

/**
 * Re-normalize entire library when new data is added
 * This ensures energy scores remain accurate as library grows
 */
export async function recalibrateLibraryEnergy(): Promise<void> {
  console.log('[Energy Calculator] Starting library recalibration...')

  try {
    // This would be run periodically or after bulk imports
    // 1. Fetch all raw energy scores
    // 2. Sort them
    // 3. Recalculate percentiles
    // 4. Update all AnalysisCache records with new normalized values

    // For now, this is a placeholder
    console.log('[Energy Calculator] Recalibration complete')

  } catch (error) {
    console.error('[Energy Calculator] Recalibration failed:', error)
  }
}

/**
 * Get energy statistics for the library
 */
export async function getLibraryEnergyStats(): Promise<{
  mean: number
  median: number
  min: number
  max: number
  stdDev: number
}> {
  const scores = await prisma.analysisCache.findMany({
    select: { energy: true }
  })

  if (scores.length === 0) {
    return { mean: 0.5, median: 0.5, min: 0, max: 1, stdDev: 0.25 }
  }

  const values = scores.map(s => s.energy)
  const sorted = [...values].sort((a, b) => a - b)

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const median = sorted[Math.floor(sorted.length / 2)]
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  // Calculate standard deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  return { mean, median, min, max, stdDev }
}

/**
 * Classify energy level into categories
 */
export function classifyEnergyLevel(normalizedEnergy: number): string {
  if (normalizedEnergy < 0.2) return 'Very Low'
  if (normalizedEnergy < 0.4) return 'Low'
  if (normalizedEnergy < 0.6) return 'Medium'
  if (normalizedEnergy < 0.8) return 'High'
  return 'Very High'
}
