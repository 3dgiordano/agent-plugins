def camel_to_snake(s):
    import re
    return re.sub(r"(?<!^)(?=[A-Z])", "_", s).lower()
