#!/usr/bin/env python3
"""Tạo khóa bí mật TOTP cho két sắt + mã QR để quét bằng Google Authenticator.

    python3 tools/gen_secret.py                 # tạo khóa mới
    python3 tools/gen_secret.py --secret ABC... # tạo lại QR cho khóa có sẵn

Nếu đã cài thư viện qrcode (pip install "qrcode[pil]") script sẽ lưu file
totp_qr.png; nếu chưa, hãy dán link otpauth:// vào một trình tạo QR offline.
Giữ bí mật khóa này: ai có nó đều sinh được mã OTP.
"""
import argparse
import base64
import hmac
import hashlib
import secrets
import struct
import time
from urllib.parse import quote


def totp(secret_b32: str, t: float | None = None) -> str:
    key = base64.b32decode(secret_b32 + "=" * (-len(secret_b32) % 8))
    counter = int((time.time() if t is None else t) // 30)
    mac = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    off = mac[19] & 0x0F
    code = (struct.unpack(">I", mac[off:off + 4])[0] & 0x7FFFFFFF) % 1_000_000
    return f"{code:06d}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--secret", help="khóa Base32 có sẵn")
    ap.add_argument("--label", default="KetSat01", help="tên hiển thị trong app")
    ap.add_argument("--issuer", default="KetSatIoT")
    args = ap.parse_args()

    # 20 byte ngẫu nhiên = 160 bit, đúng khuyến nghị RFC 4226
    secret = args.secret or base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")
    uri = (f"otpauth://totp/{quote(args.issuer)}:{quote(args.label)}"
           f"?secret={secret}&issuer={quote(args.issuer)}&algorithm=SHA1&digits=6&period=30")

    print("TOTP_SECRET_B32 (dán vào config.h):")
    print(f'  #define TOTP_SECRET_B32  "{secret}"\n')
    print("Link otpauth (để tạo QR):")
    print(f"  {uri}\n")
    print(f"Mã hiện tại để đối chiếu với app: {totp(secret)}")

    try:
        import qrcode  # type: ignore
        qrcode.make(uri).save("totp_qr.png")
        print("\nĐã lưu mã QR: totp_qr.png  -> mở Google Authenticator, chọn + > Quét mã QR")
    except ImportError:
        print('\n(Chưa có thư viện qrcode: pip install "qrcode[pil]" để xuất ảnh QR,'
              "\n hoặc trong app chọn + > Nhập khoá thiết lập, dán khóa ở trên, chọn 'Dựa trên thời gian'.)")


if __name__ == "__main__":
    main()
