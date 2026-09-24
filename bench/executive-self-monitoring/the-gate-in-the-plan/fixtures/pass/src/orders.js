'use strict';

async function forUser(db, userId) {
  return db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY placed_at DESC', [userId]);
}

module.exports = { forUser };
