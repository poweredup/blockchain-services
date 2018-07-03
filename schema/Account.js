exports = module.exports = function(db, mongoose) {
  const accountSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    firstName: { type: String },
    lastName: { type: String },
    walletId: { type: String, required: true },
    privateKey: { type: String, required: true },
    gamerId: { type: String, required: true }
  });
  db.model('Account', accountSchema);
};
