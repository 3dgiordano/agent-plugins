'use strict';
// URL slugs for product names.
function slug(name) {
  return name.toLowerCase().replace(/ /g, '-');
}
module.exports = { slug };
