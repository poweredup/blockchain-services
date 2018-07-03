const jwt = require('jsonwebtoken');
const jwtKey = require('../config').jwtKey;
//convenience functions
jwt.getIdFromToken = token => jwt.verify(token, jwtKey).data.user;
jwt.getWalletFromToken = (token, app) => {
  const userId = jwt.getIdFromToken(token);
  return app.db.models.Account.findOne({ userId });
};

exports = module.exports = jwt;
