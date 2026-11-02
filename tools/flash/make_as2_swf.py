"""Builds the ActionScript 2 test SWF straight from AVM1 bytecode (the Flex SDK only compiles ActionScript 3).

The SWF writes SharedObjects with Flash Player's AS2 encoder, then reads the SOL files Minerva wrote and traces
"VALUE AS2 <name> <value>" lines, which check_log.py compares with EXPECTED below. See README.md.

Usage: python3 make_as2_swf.py <out.swf>
"""
import struct
import sys

EMOJI = 'Saved 😀 at 🏰 — level 𝄞'
KEY = '名前😀'

# What the VALUE lines should say when Flash reads Minerva's files correctly
EXPECTED = {
    'refsFirst': 'a string',
    'copyIsShared': 'true',
    'list0IsShared': 'true',
    'selfMeIsSelf': 'true',
    'sharedTag': 'shared',
    'emojiOk': 'true',
    'emojiKeyOk': 'true',
    'ascii65535Length': '65535',
    'ascii65536Length': '65536',
    'euro21845Length': '21845',
    'euro21846Length': '21846',
    'longUnicodeLength': '40000',
}


class Asm:
    """A tiny AVM1 assembler: just the actions this test needs."""

    def __init__(self):
        self.b = bytearray()

    def op(self, code, data=b''):
        self.b.append(code)
        if code >= 0x80:
            self.b += struct.pack('<H', len(data)) + data
        return self

    def push(self, *vals):
        d = bytearray()
        for v in vals:
            if isinstance(v, bool):
                d += bytes([5, int(v)])
            elif isinstance(v, int):
                d += bytes([7]) + struct.pack('<i', v)
            else:
                d += bytes([0]) + v.encode('utf-8') + b'\0'  # SWF 6+ strings are UTF-8
        return self.op(0x96, bytes(d))

    def get(self, name):
        return self.push(name).op(0x1C)  # GetVariable

    def setvar(self):
        return self.op(0x1D)  # SetVariable: name, value

    def getm(self, name):
        return self.push(name).op(0x4E)  # GetMember

    def setm(self):
        return self.op(0x4F)  # SetMember: object, name, value

    def new(self, cls, *args):
        for a in reversed(args):
            self.push(a)
        return self.push(len(args), cls).op(0x40)  # NewObject

    def obj(self, *pairs):
        return self.push(*pairs, len(pairs) // 2).op(0x43)  # InitObject: name, value, ..., count

    def call(self, obj_var, method, *args):
        for a in reversed(args):
            self.push(a)
        return self.push(len(args)).get(obj_var).push(method).op(0x52)  # CallMethod

    def trace(self):
        return self.op(0x26)


def build():
    a = Asm()

    def open_so(name):
        a.push('so')
        a.call('SharedObject', 'getLocal', name)
        a.setvar()
        a.push('d').get('so').getm('data').setvar()

    def flush():
        a.call('so', 'flush').op(0x17)  # Pop the result

    # as2-amf0: primitives first, then a shared object, an array holding it, and an object that holds itself
    open_so('as2-amf0')
    a.get('d').push('first', 'a string').setm()
    a.get('d').push('count', 5).setm()
    a.push('o').obj('tag', 'shared', 'v', 1).setvar()
    a.get('d').push('shared').get('o').setm()
    a.get('d').push('copy').get('o').setm()
    a.get('d').push('list', 'x').get('o').push(2).op(0x42).setm()  # InitArray: [o, "x"]
    a.push('s').obj('name', 'loop').setvar()
    a.get('s').push('me').get('s').setm()
    a.get('d').push('self').get('s').setm()
    a.get('d').push('emoji', EMOJI).setm()
    a.get('d').push(KEY, 'key with emoji').setm()
    flush()

    # as2-dates: does a Date or an XML document take a reference number?
    open_so('as2-dates')
    a.get('d').push('first', 'a string').setm()
    a.get('d').push('when').new('Date', 0).setm()
    a.get('d').push('doc').new('XML', '<a/>').setm()
    a.push('p').obj('tag', 'shared').setvar()
    a.get('d').push('shared').get('p').setm()
    a.get('d').push('copy').get('p').setm()
    a.push('q').obj('name', 'loop').setvar()
    a.get('q').push('me').get('q').setm()
    a.get('d').push('self').get('q').setm()
    flush()

    # as2-arr-date / as2-arr-xml: the same question with arrays, which keep their order
    for name, first in (('as2-arr-date', lambda: a.new('Date', 0)), ('as2-arr-xml', lambda: a.new('XML', '<a/>'))):
        open_so(name)
        a.get('d').push('arr').get('p').get('p')
        first()
        a.push(3).op(0x42).setm()  # [Date|XML, p, p]
        flush()

    def value(label, build_value):
        a.push('VALUE AS2 ' + label + ' ')
        build_value()
        a.op(0x47).trace()  # Add2, Trace

    # Read Minerva's AMF0 files
    a.push('r')
    a.call('SharedObject', 'getLocal', 'Test-AMF0-References')
    a.getm('data').setvar()
    value('refsFirst', lambda: a.get('r').getm('first'))
    value('copyIsShared', lambda: (a.get('r').getm('copy'), a.get('r').getm('shared'), a.op(0x49)))  # Equals2
    value('list0IsShared', lambda: (a.get('r').getm('list').getm('0'), a.get('r').getm('shared'), a.op(0x49)))
    value('selfMeIsSelf', lambda: (a.get('r').getm('self').getm('me'), a.get('r').getm('self'), a.op(0x49)))
    value('sharedTag', lambda: a.get('r').getm('shared').getm('tag'))
    a.push('t')
    a.call('SharedObject', 'getLocal', 'Test-AMF0-Strings')
    a.getm('data').setvar()
    value('emojiOk', lambda: (a.get('t').getm('emoji'), a.push(EMOJI), a.op(0x49)))
    value('emojiKeyOk', lambda: (a.get('t').getm(KEY), a.push('key with emoji'), a.op(0x49)))
    for k in ('ascii65535', 'ascii65536', 'euro21845', 'euro21846', 'longUnicode'):
        value(k + 'Length', lambda k=k: a.get('t').getm(k).getm('length'))

    a.push('DONE').trace()
    a.op(0x83, b'FSCommand:quit\0\0')  # GetURL: fscommand("quit")
    a.op(0x00)
    return bytes(a.b)


def tag(code, data):
    if len(data) >= 0x3F:
        return struct.pack('<HI', (code << 6) | 0x3F, len(data)) + data
    return struct.pack('<H', (code << 6) | len(data)) + data


def swf(actions):
    # Stage size as a RECT: 5-bit field size, then xmin, xmax, ymin, ymax in twips
    nbits, vals = 15, (0, 4000, 0, 3000)
    bits = format(nbits, '05b') + ''.join(format(v, f'0{nbits}b') for v in vals)
    bits += '0' * (-len(bits) % 8)
    body = int(bits, 2).to_bytes(len(bits) // 8, 'big')
    body += struct.pack('<HH', 12 << 8, 1)  # 12 fps, 1 frame
    body += tag(9, b'\xff\xff\xff')  # SetBackgroundColor
    body += tag(12, actions)  # DoAction
    body += tag(1, b'') + tag(0, b'')  # ShowFrame, End
    return b'FWS' + bytes([8]) + struct.pack('<I', 8 + len(body)) + body  # SWF 8, uncompressed


if __name__ == '__main__':
    with open(sys.argv[1], 'wb') as f:
        f.write(swf(build()))
