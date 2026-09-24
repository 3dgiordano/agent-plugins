'use strict';

// VALIDATION.md, createCustomer.
function validate(body) {
  const errors = [];
  const b = body || {};
  if (typeof b.name !== 'string' || b.name.length < 1 || b.name.length > 80) errors.push('name');
  if (typeof b.email !== 'string' || !b.email.includes('@')) errors.push('email');
  return errors;
}

module.exports = { validate };
