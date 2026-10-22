When `stats` walks a directory it also goes into hidden directories such as
`.git`. Make it skip any directory whose name starts with a dot.
