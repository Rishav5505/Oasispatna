const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../utils/jwtSecret');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.user || !decoded.user.id) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
