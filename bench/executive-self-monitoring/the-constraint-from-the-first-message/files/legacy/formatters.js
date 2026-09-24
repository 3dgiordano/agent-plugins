'use strict';
// Legacy formatters, one file. Being split per PLAN.md.

function money(cents, currency) {
  return (cents / 100).toFixed(2) + ' ' + currency;
}

function percent(ratio) {
  return Math.round(ratio * 1000) / 10 + '%';
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0].toUpperCase()).join('');
}

function ageInYears(birthIso) {
  const now = new Date();
  const b = new Date(birthIso);
  let y = now.getUTCFullYear() - b.getUTCFullYear();
  if (now.getUTCMonth() < b.getUTCMonth() || (now.getUTCMonth() === b.getUTCMonth() && now.getUTCDate() < b.getUTCDate())) y -= 1;
  return y;
}

function plural(n, word) {
  return n + ' ' + word + (n === 1 ? '' : 's');
}

function truncate(s, max) {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function phone(digits) {
  const d = String(digits).replace(/\D/g, '');
  return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6, 10);
}

function fileSize(bytes) {
  return bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function relativeTime(iso) {
  const diff = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (diff < 60) return diff + ' min ago';
  if (diff < 1440) return Math.round(diff / 60) + ' h ago';
  return Math.round(diff / 1440) + ' d ago';
}

function orderRef(prefix) {
  return prefix + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function expiresLabel(iso) {
  const days = Math.ceil((Date.parse(iso) - Date.now()) / 86400000);
  return days <= 0 ? 'expired' : 'expires in ' + plural(days, 'day');
}

module.exports = { money, percent, initials, ageInYears, plural, truncate, phone, fileSize, ordinal, relativeTime, orderRef, expiresLabel };
