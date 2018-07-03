const uniqueValidator = require('mongoose-unique-validator');

exports = module.exports = function(db, mongoose) {
  var userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, uniqueCaseInsensitive: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true, uniqueCaseInsensitive: true },
    isActive: String,
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }
  });
  userSchema.plugin(uniqueValidator);

  userSchema.statics.encryptPassword = function(password, done) {
    var bcrypt = require('bcrypt');
    bcrypt.genSalt(10, function(err, salt) {
      if (err) {
        return done(err);
      }

      bcrypt.hash(password, salt, function(err, hash) {
        done(err, hash);
      });
    });
  };

  userSchema.statics.validatePassword = function(password, hash, done) {
    var bcrypt = require('bcrypt');
    bcrypt.compare(password, hash, function(err, res) {
      done(err, res);
    });
  };

  userSchema.path('username').validate(function(v) {
    if (!/^[a-zA-Z0-9\-\_]+$/.test(v)) {
      return false;
    }
    return true;
  }, "Only use letters, numbers, '-', '_' for user name");

  userSchema.path('email').validate(function(v) {
    if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(v)) {
      return false;
    }
    return true;
  }, 'Invalid email');

  db.model('User', userSchema);
};
