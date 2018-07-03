exports = module.exports = function(db, mongoose) {
  const userErrorSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    message: { type: String, required: true },
    error: { type: mongoose.Schema.Types.Mixed },
    timeStamp: { type: mongoose.Schema.Types.Number, required: true }
  });

  userErrorSchema.plugin(require('./plugins/pagedFind'));

  db.model('UserError', userErrorSchema);
};
