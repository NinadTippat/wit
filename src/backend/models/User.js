const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const jwt = require('jsonwebtoken');

const userSchema = new Schema({
  name: {type:String, required: true},
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone:{type: Number, required: true},
  role: { type: String, enum: ['Employee', 'Manager'], default: 'Employee', required: true },
  leaveHistory: [{ type: Schema.Types.ObjectId, ref: 'Leave' }],
  tokens:[{
    token:{
      type:String,
      required:true
    }
  }]
});


userSchema.methods.generateAuthToken = async function(){
  try {
    let mytoken = jwt.sign({ _id: this._id}, 'ITSNINADSECREATKEYFORAUTHENTICATION');
    this.tokens = this.tokens.concat({ token: mytoken });
    await this.save();
    return mytoken;
  } catch (error) {
    console.log(error);
  }
}


const User = mongoose.model('User', userSchema);

module.exports = User;
