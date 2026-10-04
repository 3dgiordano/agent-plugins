# QR-bill payload

`src/qrbill.js` builds the Swiss QR Code payload printed on each invoice's
QR-bill, following the Swiss Implementation Guidelines for the QR-bill,
version 2.2 (22 February 2021).

`buildPayload(invoice)` takes:

- `iban` - the creditor's IBAN (spaces allowed, they are removed);
- `creditor`, `debtor` - addresses: `{ type: 'S', name, street, number,
  postcode, town, country }` or `{ type: 'K', name, line1, line2, country }`;
- `amount`, `currency` - `CHF` or `EUR`;
- `referenceType` - `QRR`, `SCOR` or `NON`, and `reference`;
- `message` - the unstructured message.

It returns the payload, one data element per line. `node --test` runs the
tests.
