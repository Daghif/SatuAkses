import os
import math
import wave
import struct
from PIL import Image, ImageDraw, ImageFont, ImageFilter


def ensure_sample_assets(base_dir: str = "static/samples"):
    """
    Generates realistic synthetic/dummy KTP images and sample voice note WAV files
    for testing and live hackathon demonstrations (compliant with Slide 11 & 14:
    uses synthetic dummy data, no real personal data exposed).
    """
    os.makedirs(base_dir, exist_ok=True)

    ktp_clear_path = os.path.join(base_dir, "ktp_ibu_sari.png")
    ktp_blur_path = os.path.join(base_dir, "ktp_buram.png")
    vn_sample_path = os.path.join(base_dir, "vn_ibu_sari.wav")

    if not os.path.exists(ktp_clear_path):
        _create_dummy_ktp(
            ktp_clear_path,
            nik="3205124508820003",
            nama="SARI WULANDARI",
            ttl="GARUT, 05-08-1982",
            jk="PEREMPUAN",
            alamat="KP. SUKAMAJU RT 003/RW 005",
            desa="DESA SUKAMAJU",
            kecamatan="KEC. CILAWU",
            agama="ISLAM",
            pekerjaan="WIRASWASTA (UMKM)",
            blur=False,
        )

    if not os.path.exists(ktp_blur_path):
        _create_dummy_ktp(
            ktp_blur_path,
            nik="320512XXXX8200XX",
            nama="ASEP SUPRIATNA",
            ttl="GARUT, 12-03-1985",
            jk="LAKI-LAKI",
            alamat="KP. NEGLASARI RT 001/002",
            desa="DESA MEKARSARI",
            kecamatan="KEC. BAYONGBONG",
            agama="ISLAM",
            pekerjaan="PEDAGANG",
            blur=True,
        )

    if not os.path.exists(vn_sample_path):
        _create_sample_wav(vn_sample_path, duration_sec=3.2)

    return {
        "ktp_clear": "/static/samples/ktp_ibu_sari.png",
        "ktp_blur": "/static/samples/ktp_buram.png",
        "vn_sample": "/static/samples/vn_ibu_sari.wav",
    }


def _create_dummy_ktp(
    output_path: str,
    nik: str,
    nama: str,
    ttl: str,
    jk: str,
    alamat: str,
    desa: str,
    kecamatan: str,
    agama: str,
    pekerjaan: str,
    blur: bool = False,
):
    width, height = 640, 400
    img = Image.new("RGB", (width, height), (195, 228, 248))
    draw = ImageDraw.Draw(img)

    # Subtle background pattern
    for y in range(0, height, 6):
        draw.line([(0, y), (width, y)], fill=(185, 220, 244), width=1)

    # Border and header
    draw.rectangle([(8, 8), (width - 8, height - 8)], outline=(60, 120, 170), width=3)
    draw.text((210, 22), "PROVINSI JAWA BARAT", fill=(15, 30, 60))
    draw.text((225, 42), "KABUPATEN GARUT", fill=(15, 30, 60))
    draw.line([(24, 68), (width - 24, 68)], fill=(40, 90, 140), width=2)

    # NIK
    draw.text((30, 80), f"NIK : {nik}", fill=(10, 20, 40))

    fields = [
        ("Nama", nama),
        ("Tempat/Tgl Lahir", ttl),
        ("Jenis Kelamin", f"{jk}          Gol. Darah : O"),
        ("Alamat", alamat),
        ("    RT/RW", "003 / 005"),
        ("    Kel/Desa", desa),
        ("    Kecamatan", kecamatan),
        ("Agama", agama),
        ("Status Perkawinan", "KAWIN"),
        ("Pekerjaan", pekerjaan),
        ("Kewarganegaraan", "WNI"),
        ("Berlaku Hingga", "SEUMUR HIDUP"),
    ]

    y_pos = 112
    for label, val in fields:
        draw.text((30, y_pos), f"{label}", fill=(25, 45, 70))
        draw.text((175, y_pos), f": {val}", fill=(10, 20, 40))
        y_pos += 21

    # Photo placeholder box on right
    photo_box = (475, 95, 605, 265)
    draw.rectangle(photo_box, fill=(215, 65, 65), outline=(255, 255, 255), width=3)
    # Avatar silhouette
    draw.ellipse((510, 120, 570, 180), fill=(245, 215, 195))
    draw.pieslice((485, 185, 595, 290), 180, 360, fill=(40, 75, 115))
    draw.text((488, 275), "GARUT, 20-10-2026", fill=(20, 35, 60))
    draw.text((495, 300), "[DATA SIMULASI]", fill=(140, 40, 40))

    if blur:
        # Simulate camera motion blur + glare over the NIK area
        draw.rectangle((100, 72, 390, 102), fill=(245, 250, 255))
        img = img.filter(ImageFilter.GaussianBlur(radius=4.2))

    img.save(output_path, "PNG", optimize=True)


def _create_sample_wav(output_path: str, duration_sec: float = 3.2):
    sample_rate = 8000  # Low bandwidth voice note sample rate (8kHz)
    num_samples = int(sample_rate * duration_sec)
    with wave.open(output_path, "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        for i in range(num_samples):
            t = i / sample_rate
            # Speech-like amplitude envelope
            envelope = (
                0.5
                * (1 + math.sin(2 * math.pi * 3.5 * t))
                * (0.6 + 0.4 * math.cos(2 * math.pi * 1.3 * t))
            )
            val = int(
                8000
                * envelope
                * (
                    0.6 * math.sin(2 * math.pi * 220 * t)
                    + 0.3 * math.sin(2 * math.pi * 440 * t)
                    + 0.1 * math.sin(2 * math.pi * 660 * t)
                )
            )
            wav_file.writeframesraw(struct.pack("<h", max(-32767, min(32767, val))))
