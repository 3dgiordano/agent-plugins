def anagrams(a, b):
    norm = lambda s: sorted(s.replace(" ", "").lower())
    return norm(a) == norm(b)
