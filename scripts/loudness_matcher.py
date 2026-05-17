import os
import glob
import json
import argparse
import subprocess
import re
import math
import numpy as np
import scipy.signal
import pyloudnorm as pyln
from pedalboard import Pedalboard, Limiter, Gain
from pedalboard.io import AudioFile


def get_ffmpeg_loudness(filepath):
    cmd = [
        "ffmpeg", "-nostats", "-i", filepath,
        "-filter_complex", "ebur128", "-f", "null", "-"
    ]
    result = subprocess.run(cmd, stderr=subprocess.PIPE, text=True)
    output = result.stderr

    i_matches = re.findall(r"I:\s+(-?\d+\.\d+) LUFS", output)
    lra_matches = re.findall(r"LRA:\s+(\d+\.\d+) LU", output)

    if not i_matches or not lra_matches:
        raise ValueError("Could not find loudness stats in FFmpeg output.")

    m_matches = re.findall(r"M:\s*(-?\d+\.\d+)", output)
    s_matches = re.findall(r"S:\s*(-?\d+\.\d+)", output)

    return {
        "lufs_i": float(i_matches[-1]),
        "lra": float(lra_matches[-1]),
        "lufs_m_max": max([float(m) for m in m_matches]) if m_matches else -70.0,
        "lufs_s_max": max([float(s) for s in s_matches]) if s_matches else -70.0
    }


def align_and_trim(master, mix, sr):
    # Use first 30 seconds to find alignment lag (memory safe)
    max_samples = min(master.shape[1], mix.shape[1], sr * 30)

    m_mono = np.mean(master[:, :max_samples], axis=0)
    x_mono = np.mean(mix[:, :max_samples], axis=0)

    correlation = scipy.signal.correlate(m_mono, x_mono, mode='full')
    lag = np.argmax(correlation) - (len(x_mono) - 1)

    aligned_mix = np.zeros_like(master)

    if lag > 0:
        valid_len = min(master.shape[1] - lag, mix.shape[1])
        aligned_mix[:, lag:lag+valid_len] = mix[:, :valid_len]
    elif lag < 0:
        lag_abs = abs(lag)
        valid_len = min(master.shape[1], mix.shape[1] - lag_abs)
        aligned_mix[:, :valid_len] = mix[:, lag_abs:lag_abs+valid_len]
    else:
        valid_len = min(master.shape[1], mix.shape[1])
        aligned_mix[:, :valid_len] = mix[:, :valid_len]

    return aligned_mix, lag


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stems", default="stems")
    parser.add_argument("--master", required=True)
    parser.add_argument("--tol", type=float, default=0.1)
    parser.add_argument("--out", default="metadata.json")
    parser.add_argument("--out_audio", default="mixed_limited_stems.mp3")
    args = parser.parse_args()

    print(f"Loading Master: {args.master}")
    with AudioFile(args.master) as f:
        master_audio = f.read(f.frames)
        master_sr = f.samplerate

    master_stats = get_ffmpeg_loudness(args.master)
    print(f"Master Stats: {master_stats['lufs_i']} LUFS-I at {master_sr} Hz")

    print(f"Loading Stems from: {args.stems}")
    stem_files = glob.glob(os.path.join(args.stems, "*.wav")) + \
        glob.glob(os.path.join(args.stems, "*.mp3"))
    mixed_stems = np.zeros_like(master_audio)

    for file in stem_files:
        with AudioFile(file) as f:
            audio = f.read(f.frames)
            stem_sr = f.samplerate

            if audio.shape[0] == 1:
                audio = np.vstack((audio, audio))

            if stem_sr != master_sr:
                print(
                    f"  -> Resampling {os.path.basename(file)} from {stem_sr}Hz to {master_sr}Hz...")
                gcd = math.gcd(master_sr, stem_sr)
                audio = scipy.signal.resample_poly(
                    audio, up=master_sr//gcd, down=stem_sr//gcd, axis=1)

            valid_len = min(mixed_stems.shape[1], audio.shape[1])
            mixed_stems[:, :valid_len] += audio[:, :valid_len]

    meter = pyln.Meter(master_sr)
    initial_stem_lufs = meter.integrated_loudness(mixed_stems.T)
    initial_delta = master_stats['lufs_i'] - initial_stem_lufs

    print(
        f"Optimizing Limiter Drive (Target: {master_stats['lufs_i']} LUFS)...")
    low_gain, high_gain = initial_delta - 10.0, initial_delta + 15.0
    best_drive = initial_delta

    for _ in range(25):
        mid_gain = (low_gain + high_gain) / 2
        board = Pedalboard([Gain(gain_db=mid_gain), Limiter(
            threshold_db=-0.1, release_ms=100)])
        processed = board(mixed_stems, master_sr)
        current_i = meter.integrated_loudness(processed.T)

        if abs(current_i - master_stats['lufs_i']) < args.tol:
            best_drive = mid_gain
            break
        if current_i < master_stats['lufs_i']:
            low_gain = mid_gain
        else:
            high_gain = mid_gain
        best_drive = mid_gain

    print(f"Optimal Drive: {best_drive:+.2f} dB. Aligning signals...")
    board = Pedalboard([Gain(gain_db=best_drive), Limiter(
        threshold_db=-0.1, release_ms=100)])
    final_mix_raw = board(mixed_stems, master_sr)

    aligned_mix, sample_lag = align_and_trim(
        master_audio, final_mix_raw, master_sr)
    lag_ms = (sample_lag / master_sr) * 1000

    temp_wav = "temp_mix_aligned.wav"
    with AudioFile(temp_wav, 'w', master_sr, aligned_mix.shape[0]) as f:
        f.write(aligned_mix)

    mix_stats = get_ffmpeg_loudness(temp_wav)

    if args.out_audio:
        print(f"Exporting to: {args.out_audio} at {master_sr}Hz")
        out_audio_dir = os.path.dirname(args.out_audio)
        if out_audio_dir:
            os.makedirs(out_audio_dir, exist_ok=True)
        cmd = ["ffmpeg", "-y", "-i", temp_wav, "-ar", str(master_sr)]

        if args.out_audio.lower().endswith(".mp3"):
            cmd.extend(["-b:a", "320k"])

        cmd.append(args.out_audio)
        subprocess.run(cmd, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL)

    os.remove(temp_wav)

    output_data = {
        "alignment": {
            "master_sample_rate_hz": master_sr,
            "offset_samples_applied": int(sample_lag),
            "offset_ms_applied": round(lag_ms, 2),
            "status": "aligned_and_length_matched"
        },
        "limiter_settings": {
            "python_pedalboard": {
                "input_drive_db": round(best_drive, 2),
                "ceiling_db": -0.1,
                "release_ms": 100
            }
        },
        "metrics": {
            "master": master_stats,
            "mix": mix_stats,
            "deltas": {
                "lufs_i": round(mix_stats['lufs_i'] - master_stats['lufs_i'], 2),
                "lra": round(mix_stats['lra'] - master_stats['lra'], 2)
            }
        }
    }

    out_dir = os.path.dirname(args.out)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    with open(args.out, "w") as j:
        json.dump(output_data, j, indent=4)
    print(f"Done. JSON saved to {args.out}")


if __name__ == "__main__":
    main()
