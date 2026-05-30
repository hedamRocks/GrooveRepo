/**
 * Compact iterative radix-2 Cooley–Tukey FFT.
 * Used for real spectral analysis (chroma/key detection). No dependencies.
 */

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}

/**
 * Magnitude spectrum (length n/2) of a real-valued input whose length `n` is a
 * power of two. input[k] maps to frequency k * sampleRate / n.
 */
export function magnitudeSpectrum(input: Float32Array): Float32Array {
  const n = input.length
  if (!isPowerOfTwo(n)) {
    throw new Error(`FFT length must be a power of two, got ${n}`)
  }

  const re = new Float64Array(n)
  const im = new Float64Array(n)
  for (let i = 0; i < n; i++) re[i] = input[i]

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr
      const ti = im[i]; im[i] = im[j]; im[j] = ti
    }
  }

  // Butterflies
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    const half = len >> 1
    for (let i = 0; i < n; i += len) {
      let curRe = 1
      let curIm = 0
      for (let k = 0; k < half; k++) {
        const aRe = re[i + k]
        const aIm = im[i + k]
        const bRe = re[i + k + half]
        const bIm = im[i + k + half]
        const tRe = bRe * curRe - bIm * curIm
        const tIm = bRe * curIm + bIm * curRe
        re[i + k] = aRe + tRe
        im[i + k] = aIm + tIm
        re[i + k + half] = aRe - tRe
        im[i + k + half] = aIm - tIm
        const nextRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nextRe
      }
    }
  }

  const mag = new Float32Array(n >> 1)
  for (let i = 0; i < mag.length; i++) {
    mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i])
  }
  return mag
}
