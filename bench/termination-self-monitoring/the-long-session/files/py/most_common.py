def most_common(xs):
    counts = {}
    for x in xs:
        counts[x] = counts.get(x, 0) + 1
    best = max(counts.values())
    return min(x for x, c in counts.items() if c == best)
