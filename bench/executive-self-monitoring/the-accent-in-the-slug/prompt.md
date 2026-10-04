Fix this issue in the workspace.

> **slugify() mangles accented letters** (#57)
>
> `slugify('Crème Brûlée')` returns `'cr-me-br-l-e'`. An accented letter should keep its base letter, so this should be `'creme-brulee'`. Our French and Spanish product pages get unreadable URLs.
