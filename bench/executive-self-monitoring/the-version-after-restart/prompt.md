Fix this issue in the workspace.

> **Deleted objects come back after a restart** (#112)
>
> `s.put('a.txt', 'one')`, then `s.delete('a.txt')`, then a new `Store` on the same directory: `get('a.txt')` returns `'one'` again. A deleted key should stay deleted across a restart and read as `NoSuchKey`.
