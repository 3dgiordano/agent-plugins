def pairwise_sums(xs):
    return [a + b for a, b in zip(xs, xs[1:])]
