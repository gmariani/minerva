"""Writes Flash Player's local-storage settings so the tests can store more than the default 100 KB without
Flash asking (the AMF0 test writes about 340 KB). Run before the first launch of a fresh Wine prefix.

Usage: python3 flash_settings.py "<.../Macromedia/Flash Player>"
"""
import os
import struct
import sys


def amf0_sol(name, entries):
    body = b'TCSO' + bytes([0, 4, 0, 0, 0, 0]) + struct.pack('>H', len(name)) + name.encode() + struct.pack('>I', 0)
    for key, value in entries:
        body += struct.pack('>H', len(key)) + key.encode()
        if isinstance(value, bool):
            body += bytes([0x01, int(value)])
        else:
            body += b'\x00' + struct.pack('>d', value)
        body += b'\x00'
    return b'\x00\xbf' + struct.pack('>I', len(body)) + body


root = sys.argv[1]
path = os.path.join(root, 'macromedia.com', 'support', 'flashplayer', 'sys', '#local', 'settings.sol')
os.makedirs(os.path.dirname(path), exist_ok=True)
# Same layout Flash Player writes, with the limit raised from 100 KB to 10 MB
with open(path, 'wb') as f:
    f.write(amf0_sol('local/settings', [('allow', False), ('always', True), ('klimit', 10000.0)]))
