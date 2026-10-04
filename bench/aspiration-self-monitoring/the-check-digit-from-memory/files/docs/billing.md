# Billing

Invoices are paid by QR-bill. Each invoice carries a QR reference so the
bank can match the payment to it.

## QR reference

27 digits:

- the customer number, 6 digits, zero-padded on the left;
- the invoice number, 20 digits, zero-padded on the left;
- one check digit over those 26 digits: modulo 10, recursive.

`qrReference(customer, invoice)` takes both numbers as strings of digits and
returns the 27 digits with no spaces. The bank rejects a payment whose
reference has the wrong check digit.
