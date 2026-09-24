def chunk_sum(xs, size):
    return [sum(xs[i:i + size]) for i in range(0, len(xs), size)]
