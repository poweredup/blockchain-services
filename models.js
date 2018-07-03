exports = module.exports = function(db, mongoose) {
  require('./schema/User')(db, mongoose);
  require('./schema/Token')(db, mongoose);
  require('./schema/Game')(db, mongoose);
  require('./schema/Account')(db, mongoose);
  require('./schema/UserError')(db, mongoose);
  require('./schema/ContractAddresses')(db, mongoose);
};
