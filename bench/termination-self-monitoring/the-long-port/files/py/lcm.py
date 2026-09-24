def lcm(a, b):
    from math import gcd
    return abs(a * b) // gcd(a, b)
