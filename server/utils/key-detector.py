#!/usr/bin/env python3
"""
Musical Key Detection Script
Uses librosa for audio analysis and key detection
Reads PCM audio from stdin, outputs key to stdout
"""

import sys
import json
import numpy as np
import warnings
warnings.filterwarnings('ignore')

def detect_key_from_pcm():
    """
    Read PCM audio from stdin and detect musical key
    Input: Raw PCM float32 audio samples
    Output: JSON with key, scale, and confidence
    """
    try:
        # Read float32 PCM data from stdin
        pcm_data = np.frombuffer(sys.stdin.buffer.read(), dtype=np.float32)

        if len(pcm_data) == 0:
            print(json.dumps({"error": "No audio data received"}), file=sys.stderr)
            sys.exit(1)

        # Import librosa (after reading stdin to fail fast if not installed)
        try:
            import librosa
        except ImportError:
            print(json.dumps({
                "key": "Unknown",
                "scale": "unknown",
                "confidence": 0,
                "error": "librosa not installed"
            }))
            sys.exit(0)

        # Sample rate (must match ffmpeg output)
        sr = 44100

        # Extract chroma features (pitch class profiles)
        chroma = librosa.feature.chroma_cqt(y=pcm_data, sr=sr)

        # Average chroma over time to get overall pitch distribution
        chroma_mean = np.mean(chroma, axis=1)

        # Key profiles (Krumhansl-Schmuckler key-finding algorithm)
        # Major and minor key profiles
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

        # Correlate chroma with key profiles for all 12 keys
        major_correlations = []
        minor_correlations = []

        for i in range(12):
            # Rotate profile to test each key
            major_rotated = np.roll(major_profile, i)
            minor_rotated = np.roll(minor_profile, i)

            # Calculate correlation
            major_corr = np.corrcoef(chroma_mean, major_rotated)[0, 1]
            minor_corr = np.corrcoef(chroma_mean, minor_rotated)[0, 1]

            major_correlations.append(major_corr)
            minor_correlations.append(minor_corr)

        # Find best match
        best_major_idx = np.argmax(major_correlations)
        best_minor_idx = np.argmax(minor_correlations)
        best_major_corr = major_correlations[best_major_idx]
        best_minor_corr = minor_correlations[best_minor_idx]

        # Determine if major or minor
        if best_major_corr > best_minor_corr:
            key_idx = best_major_idx
            scale = "major"
            confidence = float(best_major_corr)
        else:
            key_idx = best_minor_idx
            scale = "minor"
            confidence = float(best_minor_corr)

        # Map index to key name
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        key_name = key_names[key_idx]

        # Output result as JSON
        result = {
            "key": f"{key_name} {scale}",
            "keyName": key_name,
            "scale": scale,
            "confidence": min(max(confidence, 0), 1)  # Clamp to [0, 1]
        }

        print(json.dumps(result))

    except Exception as e:
        # Return error as JSON
        print(json.dumps({
            "key": "Unknown",
            "scale": "unknown",
            "confidence": 0,
            "error": str(e)
        }))
        sys.exit(0)

if __name__ == "__main__":
    detect_key_from_pcm()
