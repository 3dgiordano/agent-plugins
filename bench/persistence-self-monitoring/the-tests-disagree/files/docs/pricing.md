# Price formatting

`formatPrice(amount)` renders a USD amount for the checkout page:

- a `$` before the digits, and a `-` before the `$` for a negative amount: `-$5.25`
- a comma between thousands: `$1,234,567.00`
- always two decimals, rounded half up to the cent: `$3.00`, `$1,234.50`
