def caesar(s, k):
    out = ""
    for c in s:
        if c.isalpha():
            base = ord("A") if c.isupper() else ord("a")
            out += chr((ord(c) - base + k) % 26 + base)
        else:
            out += c
    return out
