const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});



/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const queryString = `
    SELECT * FROM users 
    WHERE email = $1
  `;
  return pool.query(queryString, [email])
    .then(res => res.rows[0])
    .catch(err => console.log(err.stack));
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  const queryString = `
    SELECT * FROM users
    WHERE id = $1
  `;
  return pool.query(queryString, [id])
    .then(res => res.rows[0])
    .catch(err => console.log(err.stack));
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  const queryString = `
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  return pool.query(queryString, [user.name, user.email, user.password])
    .then(res => res.rows[0])
    .catch(err => console.log(err.stack));
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const queryString = `
  SELECT properties.*, reservations.*, avg(rating) as average_rating
  FROM properties
  JOIN property_reviews ON property_reviews.property_id = properties.id
  JOIN reservations ON reservations.property_id = properties.id
  JOIN users ON reservations.guest_id = users.id
  WHERE reservations.guest_id = $1 
  AND reservations.end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY start_date
  LIMIT $2;
`;
  return pool.query(queryString, [guest_id, limit])
    .then(res => res.rows)
    .catch(err => console.log(err.stack));
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = function(options, limit = 10) {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, avg(rating) as average_rating
    FROM properties
    JOIN property_reviews ON property_reviews.property_id = properties.id
  `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryString += queryParams.length === 0 ? `WHERE ` : `AND `;
    queryParams.push(parseInt(options.owner_id));
    queryString += `properties.owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night) {
    queryString += queryParams.length === 0 ? `WHERE ` : `AND `;
    queryParams.push(parseInt(options.minimum_price_per_night));
    queryString += `properties.cost_per_night > $${queryParams.length} `;
  }

  if (options.maximum_price_per_night) {
    queryString += queryParams.length === 0 ? `WHERE ` : `AND `;
    queryParams.push(parseInt(options.maximum_price_per_night));
    queryString += `properties.cost_per_night < $${queryParams.length} `;
  }

  queryString += `GROUP BY properties.id `;
  if (options.minimum_rating) {
    queryParams.push(parseInt(options.minimum_rating));
    queryString += `HAVING avg(rating) >= $${queryParams.length} `;
  }
  queryParams.push(limit);
  queryString += `ORDER BY cost_per_night
  LIMIT $${queryParams.length};
`;
  console.log(queryString, queryParams);
  return pool.query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => err.stack);
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;
