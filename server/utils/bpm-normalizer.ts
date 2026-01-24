/**
 * BPM Normalization Logic
 * Corrects half-time / double-time detection errors
 */

// Genre-specific BPM ranges for validation
const GENRE_BPM_RANGES: Record<string, { min: number, max: number, typical: number[] }> = {
  'house': { min: 115, max: 130, typical: [120, 125, 128] },
  'techno': { min: 120, max: 140, typical: [128, 130, 135] },
  'disco': { min: 110, max: 130, typical: [115, 120, 125] },
  'funk': { min: 90, max: 120, typical: [100, 105, 110] },
  'boogie': { min: 100, max: 125, typical: [110, 115, 120] },
  'latin': { min: 80, max: 140, typical: [95, 100, 120] }, // Wide range (salsa, reggaeton, etc.)
  'salsa': { min: 80, max: 110, typical: [95, 100, 105] },
  'reggae': { min: 60, max: 90, typical: [70, 75, 80] },
  'dancehall': { min: 85, max: 110, typical: [90, 95, 100] },
  'dub': { min: 60, max: 90, typical: [70, 75, 80] },
  'soul': { min: 80, max: 120, typical: [90, 95, 100] },
  'jazz': { min: 80, max: 200, typical: [120, 140, 160] }, // Very wide range
  'hiphop': { min: 70, max: 110, typical: [85, 90, 95] },
  'trap': { min: 130, max: 170, typical: [140, 145, 150] }, // Half-time feel but high BPM
  'drum and bass': { min: 160, max: 180, typical: [170, 174, 175] },
  'dubstep': { min: 135, max: 145, typical: [140, 142, 144] },
  'garage': { min: 130, max: 140, typical: [132, 135, 138] },
  'afrobeat': { min: 100, max: 130, typical: [110, 115, 120] },
  'samba': { min: 150, max: 200, typical: [170, 180, 190] }
}

/**
 * Detect genre from track/release metadata
 */
function detectGenre(options: BPMNormalizationOptions): string | null {
  const { trackTitle = '', releaseTitle = '', styles = [] } = options

  // Combine all text for keyword matching
  const allText = `${trackTitle} ${releaseTitle} ${styles.join(' ')}`.toLowerCase()

  // Check for genre keywords
  for (const [genre, _range] of Object.entries(GENRE_BPM_RANGES)) {
    if (allText.includes(genre)) {
      console.log(`[BPM Normalizer] Detected genre: ${genre}`)
      return genre
    }
  }

  return null
}

export interface BPMNormalizationOptions {
  rawBPM: number
  confidence: number
  candidates: number[]
  libraryMedianBPM?: number
  trackTitle?: string  // For genre detection
  releaseTitle?: string  // For genre detection
  styles?: string[]  // Discogs styles/genres
}

export interface NormalizedBPM {
  bpm: number
  wasNormalized: boolean
  reason?: string
}

/**
 * Normalize BPM to handle half-time/double-time errors
 */
export function normalizeBPM(options: BPMNormalizationOptions): NormalizedBPM {
  const { rawBPM, confidence, candidates, libraryMedianBPM } = options

  console.log(`[BPM Normalizer] Raw BPM: ${rawBPM}, Confidence: ${confidence.toFixed(2)}`)

  // Detect genre from metadata
  const genre = detectGenre(options)

  // Generate candidate BPMs
  const bpmOptions: Array<{ bpm: number, score: number, reason: string }> = []

  // Always include raw BPM
  const rawScore = calculateBPMScore({
    bpm: rawBPM,
    confidence,
    candidates,
    libraryMedianBPM,
    genre
  })
  bpmOptions.push({
    bpm: rawBPM,
    score: rawScore,
    reason: 'original detection'
  })

  // Add half-time option if BPM is too low
  // Skip if confidence is high (>0.8) - trust the detection
  if (rawBPM < 80 && confidence <= 0.8) {
    const doubledBPM = rawBPM * 2
    const doubledScore = calculateBPMScore({
      bpm: doubledBPM,
      confidence,
      candidates,
      libraryMedianBPM,
      genre
    })
    bpmOptions.push({
      bpm: doubledBPM,
      score: doubledScore,
      reason: 'half-time correction (doubled)'
    })
    console.log(`[BPM Normalizer] Low confidence (${confidence.toFixed(2)}), considering doubled BPM: ${doubledBPM}`)
  } else if (rawBPM < 80) {
    console.log(`[BPM Normalizer] High confidence (${confidence.toFixed(2)}), trusting raw BPM despite low value`)
  }

  // Add double-time option if BPM is too high
  // Skip if confidence is high (>0.8) - trust the detection
  if (rawBPM > 160 && confidence <= 0.8) {
    const halvedBPM = rawBPM / 2
    const halvedScore = calculateBPMScore({
      bpm: halvedBPM,
      confidence,
      candidates,
      libraryMedianBPM,
      genre
    })
    bpmOptions.push({
      bpm: halvedBPM,
      score: halvedScore,
      reason: 'double-time correction (halved)'
    })
    console.log(`[BPM Normalizer] Low confidence (${confidence.toFixed(2)}), considering halved BPM: ${halvedBPM}`)
  } else if (rawBPM > 160) {
    console.log(`[BPM Normalizer] High confidence (${confidence.toFixed(2)}), trusting raw BPM despite high value`)
  }

  // Check candidates array for alternative tempos
  if (candidates && candidates.length > 0) {
    candidates.forEach(candidateBPM => {
      if (candidateBPM !== rawBPM) {
        const candidateScore = calculateBPMScore({
          bpm: candidateBPM,
          confidence: confidence * 0.9, // Slightly lower confidence for candidates
          candidates,
          libraryMedianBPM,
          genre
        })
        bpmOptions.push({
          bpm: candidateBPM,
          score: candidateScore,
          reason: 'alternative candidate'
        })
      }
    })
  }

  // Sort by score
  bpmOptions.sort((a, b) => b.score - a.score)

  const winner = bpmOptions[0]

  console.log(`[BPM Normalizer] Selected BPM: ${winner.bpm} (${winner.reason})`)

  return {
    bpm: Math.round(winner.bpm),
    wasNormalized: winner.bpm !== rawBPM,
    reason: winner.reason
  }
}

/**
 * Calculate score for a BPM candidate
 */
function calculateBPMScore(params: {
  bpm: number
  confidence: number
  candidates: number[]
  libraryMedianBPM?: number
  genre?: string | null
}): number {
  const { bpm, confidence, candidates, libraryMedianBPM, genre } = params

  let score = confidence

  // Genre-aware scoring
  if (genre && GENRE_BPM_RANGES[genre]) {
    const range = GENRE_BPM_RANGES[genre]

    // Strong boost if BPM is within genre range
    if (bpm >= range.min && bpm <= range.max) {
      score += 0.2
      console.log(`[BPM Score] BPM ${bpm} within ${genre} range (${range.min}-${range.max}), +0.2`)
    } else {
      // Penalty if outside genre range
      score -= 0.15
      console.log(`[BPM Score] BPM ${bpm} outside ${genre} range (${range.min}-${range.max}), -0.15`)
    }

    // Extra boost if BPM is a typical value for the genre
    if (range.typical.includes(bpm)) {
      score += 0.15
      console.log(`[BPM Score] BPM ${bpm} is typical for ${genre}, +0.15`)
    } else {
      // Small boost if close to typical values
      const closestTypical = range.typical.reduce((prev, curr) =>
        Math.abs(curr - bpm) < Math.abs(prev - bpm) ? curr : prev
      )
      if (Math.abs(closestTypical - bpm) < 5) {
        score += 0.08
        console.log(`[BPM Score] BPM ${bpm} close to typical ${genre} value (${closestTypical}), +0.08`)
      }
    }
  } else {
    // Fallback: Boost if BPM is in typical range (60-180 BPM)
    if (bpm >= 60 && bpm <= 180) {
      score += 0.1
    }

    // Boost for common tempos
    const commonTempos = [90, 100, 110, 120, 128, 130, 140, 150, 170]
    const closestCommon = commonTempos.reduce((prev, curr) =>
      Math.abs(curr - bpm) < Math.abs(prev - bpm) ? curr : prev
    )
    if (Math.abs(closestCommon - bpm) < 5) {
      score += 0.05
    }
  }

  // Boost if present in candidates array
  if (candidates && candidates.includes(bpm)) {
    score += 0.15
  }

  // Boost if close to library median (if available)
  if (libraryMedianBPM) {
    const diff = Math.abs(bpm - libraryMedianBPM)
    if (diff < 20) {
      score += 0.1
    }
  }

  return score
}

/**
 * Get library-wide median BPM (for context-aware normalization)
 */
export async function getLibraryMedianBPM(): Promise<number | undefined> {
  try {
    // Fetch all analyzed BPMs from database
    const allBPMs = await prisma.analysisCache.findMany({
      select: { bpm: true }
    })

    if (allBPMs.length === 0) {
      return undefined
    }

    // Calculate median
    const sorted = allBPMs.map(r => r.bpm).sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)

    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]

  } catch (error) {
    console.warn('[BPM Normalizer] Failed to get library median:', error)
    return undefined
  }
}
