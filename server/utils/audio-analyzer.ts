import { spawn } from 'child_process'
import * as MusicTempoModule from 'music-tempo'

// Handle both CommonJS and ES module exports
const MusicTempo = (MusicTempoModule as any).default || MusicTempoModule

/**
 * Audio Analysis Engine
 * Extracts BPM, key, and energy features from audio
 * Uses music-tempo for BPM detection and custom algorithms for key/energy
 */

export interface AudioFeatures {
  bpm: number
  bpmConfidence: number
  bpmCandidates: number[]  // Alternative BPM values detected
  key: string              // e.g. "D minor", "C major"
  keyConfidence: number
  energy: {
    loudness: number       // RMS loudness
    spectralFlux: number   // Frequency change rate
    onsetRate: number      // Beats per second
    percussiveRatio: number // High-frequency ratio (drums indicator)
  }
  rawEnergy: number        // Combined energy score (before normalization)
}

export interface AudioSamplingOptions {
  startPercent?: number  // Where to start sampling (0-100)
  durationSeconds?: number  // How long to sample
}

/**
 * Analyze audio buffer and extract features
 * Supports smart sampling to analyze only a portion of the track
 */
export async function analyzeAudio(
  audioBuffer: Buffer,
  samplingOptions?: AudioSamplingOptions
): Promise<AudioFeatures> {
  console.log('[Audio Analyzer] Starting analysis...')

  try {
    // Convert buffer to Float32Array for Essentia
    // Note: This is a simplified version - in production you'd need proper audio decoding
    const audioData = await decodeAudioBuffer(audioBuffer, samplingOptions)

    // Extract BPM
    const bpmResult = extractBPM(audioData)

    // Extract musical key
    const keyResult = extractKey(audioData)

    // Extract energy components
    const energyResult = extractEnergyFeatures(audioData)

    // Calculate raw energy score
    const rawEnergy = calculateRawEnergy(energyResult)

    console.log('[Audio Analyzer] Analysis complete:', {
      bpm: bpmResult.bpm,
      key: keyResult.key,
      rawEnergy: rawEnergy.toFixed(3)
    })

    return {
      bpm: bpmResult.bpm,
      bpmConfidence: bpmResult.confidence,
      bpmCandidates: bpmResult.candidates,
      key: keyResult.key,
      keyConfidence: keyResult.confidence,
      energy: energyResult,
      rawEnergy
    }

  } catch (error) {
    console.error('[Audio Analyzer] Error:', error)
    throw new Error(`Audio analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract BPM using music-tempo library with multi-method validation
 */
function extractBPM(audioData: Float32Array): {
  bpm: number
  confidence: number
  candidates: number[]
} {
  try {
    // music-tempo expects audio data and optional config
    // CRITICAL: Must specify sample rate for accurate BPM detection
    const tempo = new MusicTempo(audioData, {
      sampleRate: 44100
    })

    console.log('[Audio Analyzer] MusicTempo detected:', {
      tempo: tempo.tempo,
      beats: tempo.beats?.length || 0
    })

    // Get primary BPM and alternative candidates
    let primaryBPM = Math.round(tempo.tempo)

    // Additional validation: Use onset-based BPM as secondary check
    const onsetBPM = estimateBPMFromOnsets(audioData)

    console.log('[Audio Analyzer] Onset-based BPM:', onsetBPM)

    // Generate all reasonable candidates (half-time, actual, double-time)
    const tempoVariations = [
      Math.round(primaryBPM / 2),
      primaryBPM,
      Math.round(primaryBPM * 2)
    ]

    const onsetVariations = [
      Math.round(onsetBPM / 2),
      onsetBPM,
      Math.round(onsetBPM * 2)
    ]

    // Find best match between methods
    let bestMatch = primaryBPM
    let minDiff = Infinity

    for (const tempoBPM of tempoVariations) {
      for (const onsetBPMVariant of onsetVariations) {
        const diff = Math.abs(tempoBPM - onsetBPMVariant)
        if (diff < minDiff && tempoBPM >= 60 && tempoBPM <= 200) {
          minDiff = diff
          bestMatch = tempoBPM
        }
      }
    }

    // If methods agree within 5 BPM, use the match
    if (minDiff <= 5) {
      primaryBPM = bestMatch
      console.log(`[Audio Analyzer] Methods agree on ${primaryBPM} BPM (diff: ${minDiff})`)
    } else {
      console.log(`[Audio Analyzer] Methods disagree (diff: ${minDiff}), using MusicTempo: ${primaryBPM}`)
    }

    // Common BPM multiples/divisions (half-time, double-time)
    const candidates = Array.from(new Set([
      primaryBPM,
      Math.round(primaryBPM / 2), // Half-time
      Math.round(primaryBPM * 2),  // Double-time
      onsetBPM  // Include onset-based as alternative
    ])).filter(bpm => bpm >= 60 && bpm <= 200) // Reasonable range for most music

    return {
      bpm: primaryBPM,
      confidence: minDiff <= 5 ? 0.9 : 0.7, // Higher confidence when methods agree
      candidates: candidates.sort((a, b) => a - b)
    }
  } catch (error) {
    console.warn('[Audio Analyzer] BPM extraction failed:', error)
    // Fallback: estimate from onset detection
    const fallbackBPM = estimateBPMFromOnsets(audioData)
    return {
      bpm: fallbackBPM,
      confidence: 0.5,
      candidates: [Math.round(fallbackBPM / 2), fallbackBPM, Math.round(fallbackBPM * 2)]
    }
  }
}

/**
 * Estimate BPM from onset/beat detection with adaptive thresholding
 * This method works better for syncopated rhythms (Latin, reggae, etc.)
 */
function estimateBPMFromOnsets(audioData: Float32Array): number {
  const sampleRate = 44100
  const hopSize = 512
  const windowSize = 2048

  // Calculate onset strength envelope with spectral flux
  const onsetStrength: number[] = []
  let prevSpectrum: number[] | null = null

  for (let i = 0; i < audioData.length - windowSize; i += hopSize) {
    const window = audioData.slice(i, i + windowSize)

    // Calculate energy in this window
    let energy = 0
    for (let j = 0; j < window.length; j++) {
      energy += window[j] * window[j]
    }

    // Simple spectral flux: difference in energy from previous window
    let spectralFlux = Math.sqrt(energy)
    if (prevSpectrum !== null) {
      const diff = spectralFlux - prevSpectrum[0]
      spectralFlux = Math.max(0, diff) // Only positive changes (onsets)
    }

    onsetStrength.push(spectralFlux)
    prevSpectrum = [Math.sqrt(energy)]
  }

  // Adaptive peak detection using local statistics
  const peaks: number[] = []
  const windowForStats = 20 // Window size for local statistics

  for (let i = windowForStats; i < onsetStrength.length - windowForStats; i++) {
    // Calculate local mean and standard deviation
    let localSum = 0
    for (let j = i - windowForStats; j < i + windowForStats; j++) {
      localSum += onsetStrength[j]
    }
    const localMean = localSum / (windowForStats * 2)

    let variance = 0
    for (let j = i - windowForStats; j < i + windowForStats; j++) {
      variance += Math.pow(onsetStrength[j] - localMean, 2)
    }
    const localStd = Math.sqrt(variance / (windowForStats * 2))

    // Adaptive threshold: mean + 1.5 * std deviation
    const adaptiveThreshold = localMean + 1.5 * localStd

    // Peak if current value is local maximum and above adaptive threshold
    if (onsetStrength[i] > onsetStrength[i - 1] &&
        onsetStrength[i] > onsetStrength[i + 1] &&
        onsetStrength[i] > adaptiveThreshold) {
      peaks.push(i)
    }
  }

  if (peaks.length < 2) {
    console.log('[Onset Detection] Not enough peaks found, using default')
    return 120 // Default if no peaks found
  }

  // Calculate inter-beat intervals (IBIs)
  const intervals: number[] = []
  for (let i = 1; i < peaks.length; i++) {
    const ibi = (peaks[i] - peaks[i - 1]) * hopSize / sampleRate
    // Filter out very short intervals (likely false positives)
    if (ibi > 0.2) { // At least 200ms between beats (max 300 BPM)
      intervals.push(ibi)
    }
  }

  if (intervals.length === 0) {
    console.log('[Onset Detection] No valid intervals, using default')
    return 120
  }

  // Use median interval to avoid outliers
  intervals.sort((a, b) => a - b)
  const medianInterval = intervals[Math.floor(intervals.length / 2)]

  // Convert interval to BPM
  const bpm = 60 / medianInterval

  console.log(`[Onset Detection] Found ${peaks.length} peaks, median interval: ${medianInterval.toFixed(3)}s, BPM: ${Math.round(bpm)}`)

  // Clamp to reasonable range
  return Math.max(60, Math.min(200, Math.round(bpm)))
}

/**
 * Extract musical key using Krumhansl-Schmuckler algorithm
 * Simplified JavaScript implementation for key detection
 */
function extractKey(audioData: Float32Array): {
  key: string
  confidence: number
} {
  try {
    // Extract chroma features (pitch class distribution)
    const chroma = extractChromaFeatures(audioData)

    // Key profiles (Krumhansl-Schmuckler)
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

    const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

    let bestCorrelation = -1
    let bestKey = 'Unknown'
    let bestScale = 'major'

    // Test all 12 keys in both major and minor
    for (let i = 0; i < 12; i++) {
      // Test major
      const majorCorr = correlate(chroma, rotateArray(majorProfile, i))
      if (majorCorr > bestCorrelation) {
        bestCorrelation = majorCorr
        bestKey = keyNames[i]
        bestScale = 'major'
      }

      // Test minor
      const minorCorr = correlate(chroma, rotateArray(minorProfile, i))
      if (minorCorr > bestCorrelation) {
        bestCorrelation = minorCorr
        bestKey = keyNames[i]
        bestScale = 'minor'
      }
    }

    // Normalize correlation to confidence (0-1)
    const confidence = Math.max(0, Math.min(1, (bestCorrelation + 1) / 2))

    return {
      key: `${bestKey} ${bestScale}`,
      confidence
    }
  } catch (error) {
    console.warn('[Audio Analyzer] Key extraction failed:', error)
    return {
      key: 'Unknown',
      confidence: 0
    }
  }
}

/**
 * Extract chroma features (pitch class distribution)
 * Simplified version using FFT-like frequency binning
 */
function extractChromaFeatures(audioData: Float32Array): number[] {
  // Initialize 12 chroma bins (one per semitone)
  const chroma = new Array(12).fill(0)

  // Sample rate
  const sampleRate = 44100

  // Window size for frequency analysis (smaller = faster but less accurate)
  const windowSize = 4096
  const hopSize = windowSize / 2

  // Process audio in windows
  for (let i = 0; i < audioData.length - windowSize; i += hopSize) {
    // Extract window
    const window = audioData.slice(i, i + windowSize)

    // Apply Hann window to reduce spectral leakage
    const windowed = applyHannWindow(window)

    // Simplified spectral analysis (approximation of FFT)
    // We'll use autocorrelation for pitch detection
    const pitchFreq = detectPitchFrequency(windowed, sampleRate)

    if (pitchFreq > 0) {
      // Convert frequency to pitch class (0-11)
      const pitchClass = frequencyToPitchClass(pitchFreq)
      chroma[pitchClass] += 1
    }
  }

  // Normalize chroma
  const sum = chroma.reduce((a, b) => a + b, 0)
  if (sum > 0) {
    for (let i = 0; i < 12; i++) {
      chroma[i] /= sum
    }
  }

  return chroma
}

/**
 * Apply Hann window to reduce spectral leakage
 */
function applyHannWindow(data: Float32Array): Float32Array {
  const windowed = new Float32Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const windowValue = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (data.length - 1)))
    windowed[i] = data[i] * windowValue
  }
  return windowed
}

/**
 * Detect pitch frequency using autocorrelation
 */
function detectPitchFrequency(audioData: Float32Array, sampleRate: number): number {
  const minFreq = 80 // Hz (low E2)
  const maxFreq = 1000 // Hz (high C6)

  const minPeriod = Math.floor(sampleRate / maxFreq)
  const maxPeriod = Math.floor(sampleRate / minFreq)

  let bestCorrelation = 0
  let bestPeriod = 0

  // Autocorrelation
  for (let period = minPeriod; period < maxPeriod && period < audioData.length / 2; period++) {
    let correlation = 0
    for (let i = 0; i < audioData.length - period; i++) {
      correlation += audioData[i] * audioData[i + period]
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestPeriod = period
    }
  }

  if (bestPeriod === 0) return 0

  return sampleRate / bestPeriod
}

/**
 * Convert frequency to pitch class (0-11, where 0 = C)
 */
function frequencyToPitchClass(freq: number): number {
  // A4 = 440 Hz is pitch class 9 (A)
  // Formula: pitch class = (12 * log2(freq/440) + 9) mod 12
  const semitonesFromA4 = 12 * Math.log2(freq / 440)
  const pitchClass = Math.round((semitonesFromA4 + 9 + 120)) % 12
  return pitchClass
}

/**
 * Rotate array by n positions
 */
function rotateArray(arr: number[], n: number): number[] {
  const rotated = [...arr]
  for (let i = 0; i < n; i++) {
    const first = rotated.shift()!
    rotated.push(first)
  }
  return rotated
}

/**
 * Calculate Pearson correlation between two arrays
 */
function correlate(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  const n = a.length
  const meanA = a.reduce((sum, val) => sum + val, 0) / n
  const meanB = b.reduce((sum, val) => sum + val, 0) / n

  let numerator = 0
  let denomA = 0
  let denomB = 0

  for (let i = 0; i < n; i++) {
    const diffA = a[i] - meanA
    const diffB = b[i] - meanB
    numerator += diffA * diffB
    denomA += diffA * diffA
    denomB += diffB * diffB
  }

  if (denomA === 0 || denomB === 0) return 0

  return numerator / Math.sqrt(denomA * denomB)
}

/**
 * Extract energy-related features using basic audio analysis
 */
function extractEnergyFeatures(audioData: Float32Array): {
  loudness: number
  spectralFlux: number
  onsetRate: number
  percussiveRatio: number
} {
  try {
    // Calculate RMS loudness
    const loudness = calculateRMSLoudness(audioData)

    // Calculate dynamic range (proxy for spectral flux)
    const dynamicRange = calculateDynamicRange(audioData)

    // Estimate onset rate from zero crossings
    const onsetRate = calculateZeroCrossingRate(audioData)

    // High-frequency energy ratio (proxy for percussiveness)
    const percussiveRatio = calculateHighFrequencyRatio(audioData)

    return {
      loudness,
      spectralFlux: dynamicRange,
      onsetRate,
      percussiveRatio
    }
  } catch (error) {
    console.warn('[Audio Analyzer] Energy extraction failed:', error)
    return {
      loudness: -14,
      spectralFlux: 0.5,
      onsetRate: 2.0,
      percussiveRatio: 0.5
    }
  }
}

/**
 * Calculate raw energy score (before normalization)
 */
function calculateRawEnergy(energy: {
  loudness: number
  spectralFlux: number
  onsetRate: number
  percussiveRatio: number
}): number {
  // Normalize loudness to 0-1 scale (assuming range -60 to 0 LUFS)
  const loudnessNorm = Math.max(0, Math.min(1, (energy.loudness + 60) / 60))

  // Normalize spectral flux (assuming typical range 0-10)
  const fluxNorm = Math.max(0, Math.min(1, energy.spectralFlux / 10))

  // Normalize onset rate (assuming typical range 0-5 onsets/sec)
  const onsetNorm = Math.max(0, Math.min(1, energy.onsetRate / 5))

  // Weighted combination
  const rawEnergy =
    loudnessNorm * 0.4 +
    fluxNorm * 0.3 +
    onsetNorm * 0.2 +
    energy.percussiveRatio * 0.1

  return rawEnergy
}

/**
 * Calculate RMS (Root Mean Square) loudness
 */
function calculateRMSLoudness(audioData: Float32Array): number {
  let sum = 0
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i]
  }
  const rms = Math.sqrt(sum / audioData.length)
  // Convert to dB scale (-60 to 0)
  return Math.max(-60, 20 * Math.log10(rms + 1e-10))
}

/**
 * Calculate dynamic range (variation in amplitude)
 */
function calculateDynamicRange(audioData: Float32Array): number {
  const windowSize = 4410 // 100ms at 44.1kHz
  let maxDiff = 0

  for (let i = 0; i < audioData.length - windowSize; i += windowSize) {
    let windowSum = 0
    for (let j = 0; j < windowSize; j++) {
      windowSum += Math.abs(audioData[i + j])
    }
    const windowAvg = windowSum / windowSize

    if (i > 0) {
      maxDiff = Math.max(maxDiff, Math.abs(windowAvg))
    }
  }

  return Math.min(10, maxDiff * 100) // Scale to 0-10
}

/**
 * Calculate zero crossing rate (indicates frequency content)
 */
function calculateZeroCrossingRate(audioData: Float32Array): number {
  let crossings = 0
  for (let i = 1; i < audioData.length; i++) {
    if ((audioData[i] >= 0 && audioData[i - 1] < 0) || (audioData[i] < 0 && audioData[i - 1] >= 0)) {
      crossings++
    }
  }
  // Convert to rate per second
  return (crossings / audioData.length) * 44100 / 100
}

/**
 * Calculate high-frequency ratio (proxy for percussiveness)
 */
function calculateHighFrequencyRatio(audioData: Float32Array): number {
  // Sample every 100th point for efficiency
  const sampleRate = 100
  let highFreqEnergy = 0
  let totalEnergy = 0

  for (let i = 0; i < audioData.length; i += sampleRate) {
    const val = Math.abs(audioData[i])
    totalEnergy += val

    // High frequency approximation: large differences between samples
    if (i > 0 && Math.abs(audioData[i] - audioData[i - sampleRate]) > 0.1) {
      highFreqEnergy += val
    }
  }

  return totalEnergy > 0 ? Math.min(1, highFreqEnergy / totalEnergy) : 0.5
}

/**
 * Format key as string
 */
function formatKey(keyNumber: number, scale: string): string {
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const keyName = keys[keyNumber % 12]
  const scaleName = scale === 'major' ? 'major' : 'minor'
  return `${keyName} ${scaleName}`
}

/**
 * Decode audio buffer to Float32Array using ffmpeg
 * Converts MP3/AAC audio to raw PCM for analysis
 */
async function decodeAudioBuffer(
  buffer: Buffer,
  samplingOptions?: AudioSamplingOptions
): Promise<Float32Array> {
  console.log(`[Audio Analyzer] Decoding ${(buffer.length / 1024 / 1024).toFixed(2)} MB audio buffer`)

  if (samplingOptions) {
    console.log(`[Audio Analyzer] Using smart sampling: ${samplingOptions.durationSeconds}s @ ${samplingOptions.startPercent}%`)
  }

  return new Promise((resolve, reject) => {
    // Build ffmpeg arguments
    const args = [
      '-i', 'pipe:0',           // Input from stdin
    ]

    // Add sampling options if provided
    if (samplingOptions && samplingOptions.startPercent !== undefined && samplingOptions.durationSeconds !== undefined) {
      // Note: We need to get duration first, then calculate start time
      // For now, we'll use a percentage-based approach
      // This requires a two-pass approach, so we'll simplify by using a fixed start time
      // Better approach: pass duration from YouTube metadata
      args.push(
        '-ss', '0', // Will be updated in analysis-worker with actual start time
        '-t', String(samplingOptions.durationSeconds) // Duration to extract
      )
    }

    args.push(
      '-f', 's16le',            // Output format: signed 16-bit little-endian PCM
      '-acodec', 'pcm_s16le',   // PCM codec
      '-ar', '44100',           // Sample rate: 44.1kHz
      '-ac', '1',               // Mono audio (1 channel)
      '-',                      // Output to stdout
      '-hide_banner',           // Hide ffmpeg banner
      '-loglevel', 'error'      // Only show errors
    )

    // Spawn ffmpeg to decode audio to raw PCM
    const ffmpeg = spawn('ffmpeg', args)

    const chunks: Buffer[] = []
    let errorOutput = ''

    // Collect PCM data from stdout
    ffmpeg.stdout.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk))
    })

    // Collect error messages
    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    // Handle process completion
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error('[Audio Analyzer] ffmpeg error:', errorOutput)
        reject(new Error(`ffmpeg exited with code ${code}: ${errorOutput}`))
        return
      }

      try {
        // Concatenate all chunks
        const pcmBuffer = Buffer.concat(chunks)

        // Convert 16-bit PCM to Float32Array
        // PCM is signed 16-bit, so divide by 32768 to normalize to [-1, 1]
        const samples = new Float32Array(pcmBuffer.length / 2)
        for (let i = 0; i < samples.length; i++) {
          const int16 = pcmBuffer.readInt16LE(i * 2)
          samples[i] = int16 / 32768.0
        }

        const durationSeconds = samples.length / 44100
        console.log(`[Audio Analyzer] Decoded ${samples.length.toLocaleString()} samples (${durationSeconds.toFixed(1)}s)`)

        resolve(samples)
      } catch (error) {
        reject(new Error(`Failed to convert PCM to Float32Array: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })

    // Handle ffmpeg spawn errors
    ffmpeg.on('error', (error) => {
      reject(new Error(`ffmpeg not found: ${error.message}. Install with: brew install ffmpeg`))
    })

    // Write input buffer to ffmpeg stdin
    ffmpeg.stdin.write(buffer)
    ffmpeg.stdin.end()
  })
}
