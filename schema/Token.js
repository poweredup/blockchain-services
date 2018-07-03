exports = module.exports = function(db, mongoose) {
  const tokenSchema = new mongoose.Schema({
    tokenId: { type: String },
    game: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Game' },
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    status: { type: String, enum: ['confirmed', 'processing', 'failed'] },
    orderId: { type: String },
    tokenIssueDate: { type: Date }
  });

  tokenSchema.plugin(require('./plugins/pagedFind'));
  db.model('Token', tokenSchema);
};
