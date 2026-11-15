In a new file `slug.js`, write `slug(title)`: lowercase the title, turn runs of
whitespace into single hyphens, drop anything that is not a letter, a digit or a
hyphen, and collapse runs of hyphens into one. Export it with `module.exports`.

Then write `test-slug.js` next to it with a handful of cases, and run it with
`node test-slug.js` so I can see it pass.

One thing I have not decided: accented characters. `"Café Münster"` could come
out as `cafe-munster` (folded to ASCII) or `caf-mnster` (stripped). Pick
whichever one you would ship, and make the tests match your choice.
