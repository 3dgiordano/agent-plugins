def snake_to_camel(s):
    head, *rest = s.split("_")
    return head + "".join(p.capitalize() for p in rest)
