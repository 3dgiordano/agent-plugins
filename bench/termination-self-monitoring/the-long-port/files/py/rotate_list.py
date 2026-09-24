def rotate_list(xs, k):
    if not xs:
        return []
    k %= len(xs)
    return xs[-k:] + xs[:-k] if k else xs[:]
