exports = module.exports = function(db, mongoose) {
  const gameSchema = new mongoose.Schema({
    gameId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    searchKeyWords: { type: String, default: '' },
    externalLinks: { type: Array },
    platformSpecs: { type: Array },
    releaseDate: { type: Number },
    supportedLanguages: { type: Array },
    genres: { type: Array },
    players: { type: Array },
    virtualReality: { type: Array },
    legalNotice: { type: String, default: '' },
    support: { type: mongoose.Schema.Types.Mixed },
    drm: { type: mongoose.Schema.Types.Mixed },
    agencyRatings: { type: Array },
    googleAnalyticsID: { type: String, default: '' },
    downloadableContent: { type: String, default: '' },
    associatedDemos: { type: String, default: '' },
    publisher: { type: mongoose.Schema.Types.Mixed, required: true },
    platforms: { type: Array },
    images: { type: mongoose.Schema.Types.Mixed },
    price: { type: String, required: true },
    package: { type: mongoose.Schema.Types.Mixed },
    rating: { type: mongoose.Schema.Types.Mixed },
    tokensEarned: { type: Number },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    medias: { type: mongoose.Schema.Types.Mixed }
  });

  gameSchema.plugin(require('./plugins/pagedFind'));

  db.model('Game', gameSchema);
};
