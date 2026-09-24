def unrun_length(s):
    import re
    return "".join(c * int(n) for c, n in re.findall(r"(\D)(\d+)", s))
