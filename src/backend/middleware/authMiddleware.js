const jwt = require('jsonwebtoken');
const User = require('../models/User')

const authMiddleware = async(req, res, next) => {
  const token = req.cookies.jwt;
  try{
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const verifyToken = jwt.verify(token, 'ITSNINADSECREATKEYFORAUTHENTICATION');
    const rootUser = await User.findOne({_id:verifyToken._id, "tokens.token":token});
    if(!rootUser){
      throw new Error('User not found');
    }
    req.token = token;
    req.rootUser = rootUser;
    req.userId = rootUser._id;

    next();
  }catch(err){
    res.status(401).send('Unauthorized: No Token Provided');
    console.log(err);
  }

};

module.exports = authMiddleware;