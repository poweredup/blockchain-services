exports = module.exports = function(db, mongoose) {
  const contractAddressesSchema = new mongoose.Schema({
    storageAddress: { type: String },
    paymentAddress: { type: String }
  },
  {
    timestamps: {}
  });
  db.model('ContractAddresses', contractAddressesSchema);
};
