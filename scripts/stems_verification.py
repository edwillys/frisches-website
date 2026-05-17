"""
stems_verification.py

Compares a master audio file against a stems mix using STFT MSE.
Outputs a JSON object to stdout.

Usage:
    python scripts/stems_verification.py --master path/to/master.wav --mix path/to/mix.wav

Output (stdout):
    {
        "stft_mse_db": -42.1,
        "sample_rate_hz": 44100,
        "chunk_seconds": 30,
        "status": "ok"        # or "error" with "message" field
    }
"""

import argparse
import json
import math
import sys

import numpy as np
import scipy.signal
from pedalboard.io import AudioFile


def calculate_stft_error(master: np.ndarray, mix: np.ndarray, sr: int) -> float:
    """Return STFT MSE (dB) between master and mix on a centre 30-second chunk."""
    total_samples = master.shape[1]
    chunk_size = min(total_samples, sr * 30)
    start_idx = (total_samples - chunk_size) // 2

    m_mono = np.mean(master[:, start_idx: start_idx + chunk_size], axis=0)
    x_mono = np.mean(mix[:, start_idx: start_idx + chunk_size], axis=0)

    _, _, Zxx_m = scipy.signal.stft(m_mono, fs=sr, nperseg=2048)
    _, _, Zxx_x = scipy.signal.stft(x_mono, fs=sr, nperseg=2048)

    mag_m = np.abs(Zxx_m)
    mag_x = np.abs(Zxx_x)

    mse = np.mean((mag_m - mag_x) ** 2)
    mse_db = 10 * math.log10(float(mse) + 1e-10)
    return round(mse_db, 2)


def load_audio(path: str):
    with AudioFile(path) as f:
        audio = f.read(f.frames)
        sr = f.samplerate
    if audio.shape[0] == 1:
        audio = np.vstack((audio, audio))
    return audio, sr


def resample(audio: np.ndarray, from_sr: int, to_sr: int) -> np.ndarray:
    if from_sr == to_sr:
        return audio
    gcd = math.gcd(from_sr, to_sr)
    return scipy.signal.resample_poly(audio, up=to_sr // gcd, down=from_sr // gcd, axis=1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="STFT MSE verification between master and stems mix")
    parser.add_argument("--master", required=True,
                        help="Path to master audio file")
    parser.add_argument("--mix", required=True,
                        help="Path to stems mix audio file")
    args = parser.parse_args()

    try:
        master, master_sr = load_audio(args.master)
        mix, mix_sr = load_audio(args.mix)

        if mix_sr != master_sr:
            mix = resample(mix, mix_sr, master_sr)

        # Trim or pad mix to same length as master
        if mix.shape[1] < master.shape[1]:
            pad = np.zeros((mix.shape[0], master.shape[1] - mix.shape[1]))
            mix = np.hstack((mix, pad))
        else:
            mix = mix[:, : master.shape[1]]

        mse_db = calculate_stft_error(master, mix, master_sr)

        result = {
            "stft_mse_db": mse_db,
            "sample_rate_hz": master_sr,
            "chunk_seconds": min(master.shape[1] // master_sr, 30),
            "status": "ok",
        }
    except Exception as exc:
        result = {"status": "error", "message": str(exc)}

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
