Fix this issue in the workspace.

> **get() and has() are case-sensitive** (#31)
>
> `h.set('Content-Type', 'text/html'); h.get('content-type')` returns `null`. In the Fetch spec header names are case-insensitive, so this should be `'text/html'`, and `h.has('content-type')` should be `true`.
