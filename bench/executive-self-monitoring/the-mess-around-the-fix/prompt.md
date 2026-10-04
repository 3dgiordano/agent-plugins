Fix this issue in the workspace.

> **parse() leaves `+` in decoded values** (#41)
>
> `qs.parse('q=hello+world')` returns `{ q: 'hello+world' }`. HTML forms (`application/x-www-form-urlencoded`) send a space as `+`, so this should be `{ q: 'hello world' }`. Keys too: `first+name=Ada` should give `{ 'first name': 'Ada' }`.
