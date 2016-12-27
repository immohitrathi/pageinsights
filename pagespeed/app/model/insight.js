var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var InsightSchema   = new Schema( {
  site: {
        type: String,
        required: true
      },
  url: {
        type: String,
        required: true
      },
  label: {
        type: String,
        required: true
      }, 
  platform: {
        type: String,
        required: true
      },
  speed: Number, 
  pagePayload: Number, 
  htmlPayload: Number, 
  jsPayload: Number, 
  cssPayload: Number, 
  imagePayload: Number, 
  jsCalls: Number, 
  cssCalls: Number, 
  imageCalls: Number, 
  issues: Array,
  date: { type: Date, default: Date.now }
}, {collection: 'pagestats'});

module.exports = mongoose.model('pagestat', InsightSchema);