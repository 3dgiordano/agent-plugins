def word_freq(s):
    out = {}
    for w in s.lower().split():
        out[w] = out.get(w, 0) + 1
    return out
