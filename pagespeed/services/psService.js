var config = require('../config.json');
var mongod = require('mongodb');
var Q = require('q');
var https= require('https');
var mongoose   = require('mongoose');
var psDb;
// Specify your actual API key here:
var API_KEY = 'AIzaSyCtg9WGoTEfkrwAvJobz0vPfPzshCLRTHQ';
var API_URL = 'https://www.googleapis.com/pagespeedonline/v2/runPagespeed?';
var RESOURCE_TYPE_INFO = [
         {label: 'JavaScript', field: 'javascriptResponseBytes'},
         {label: 'Images', field: 'imageResponseBytes'},
         {label: 'CSS', field: 'cssResponseBytes'},
         {label: 'HTML', field: 'htmlResponseBytes'},
         {label: 'Flash', field: 'flashResponseBytes'},
         {label: 'Text', field: 'textResponseBytes'},
         {label: 'Other', field: 'otherResponseBytes'},
       ];
var DEVICE_TYPE = ['mobile','desktop'];
//mongodb://admin:Dearkaka_78@ds141098.mlab.com:41098/page-performance
// mongoose.connect(config.connectionString, function(err, database) {
//   if (err) return console.log(err)
//   psDb = database.collection('pagestats');;
// })

mongoose.connect(config.connectionString, function(err, database) {
  if (err) return console.log(err)
  psDb = database;
  // start server
  
}); // connect to our database

var agenda = require('../agenda.js');

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
  date: { type: Date, default: new Date() }
}, {collection: 'pagestats'});

var Insight = mongoose.model('pagestat', InsightSchema);
//var Insight     = require('../app/model/insight');
var service = {};

service.create = create;
service.getAll = getAll;
service.getDistinctSites = getDistinctSites;
service.fetchDataFromPageSpeedApi = fetchDataFromPageSpeedApi;
//service.deleteRecord = _delete;
//service.updateRecord = update;
service.updateStatsObject = updateStatsObject;
service.sortByImpact = sortByImpact;
service.byteConverstion = byteConverstion;
service.getSuggestions = getSuggestions;
service.getAllRecordsByLabel = getAllRecordsByLabel;

module.exports = service ;

function create (req) { 
    var deferred = Q.defer();
    var pageSpeedData = {
      site: req.site,
      url: req.url,
      label: req.label, 
      platform: req.platform,
      date: new Date()
    }
    service.fetchDataFromPageSpeedApi(req)
        .then(function(record) {  
            if(record){ 
              var apiData = (typeof record == 'object') ? record : JSON.parse(record);
              //console.log('apiData'+record["ruleGroups"]+ ">>" + typeof record);
              var speed = apiData["ruleGroups"]["SPEED"]["score"];
              pageSpeedData.speed = speed;
              pageSpeedData = service.updateStatsObject(apiData["pageStats"],pageSpeedData);
              pageSpeedData.issues = service.getSuggestions(apiData["formattedResults"]);
              var insight = new Insight(pageSpeedData);
              insight.save(req,function (err,record) {
                console.log('record saved successfully');
                if(err) deferred.reject(err);
                deferred.resolve(record);
              });
            }else {
                deferred.reject('error occured');
            }
        })
        .catch(function (err) {
            deferred.reject(err);
            console.log(err);
        });
  return deferred.promise;
}

function getAll() {    
    var deferred = Q.defer();
    Insight.aggregate(
       [
         { $sort: { site: -1, date: -1 } },
         {
            "$match": {
                "site": { "$exists": true, "$ne": null }
            }
         },
         {
           $group:
             {
              _id:{
                  site:"$site",
                  url:"$url",
                  label:"$label",
                  platform:"$platform"
               },
              site:{$first: "$site"},
              url:{$first: "$url"},
              label:{$first: "$label"},
              platform:{$first: "$platform"},
              speed:{$first: "$speed"},
              pagePayload: {$first: "$pagePayload"},
              htmlPayload: {$first: "$htmlPayload"},
              jsPayload: {$first: "$jsPayload"},
              cssPayload: {$first: "$cssPayload"},
              imagePayload: {$first: "$imagePayload"},
              jsCalls: {$first: "$jsCalls"},
              cssCalls: {$first: "$cssCalls"},
              imageCalls: {$first: "$imageCalls"},
              issues:{$first: "$issues"},
              date: { $first: "$date" }
             }
         }
       ],function (err, summary) {
          if(err){
              deferred.reject(err);
          }

          if(summary) {
              deferred.resolve(summary);
          } else {
             deferred.reject(err);
          }
        }
    )
    return deferred.promise;
}
function getAllRecordsByLabel(req) {  
//console.log(req.params,"getAllRecordsByLabel");
    var deferred = Q.defer();
    Insight.aggregate(
       [
         { $sort: { site: -1, date: -1 } },
         {
            "$match": {
                "label": { "$eq": req.params.label },
                "platform": { "$eq": req.params.platform }
            }
         }
       ],function (err, summary) {
          if(err){
              deferred.reject(err);
          }

          if(summary) {
              deferred.resolve(summary);
          } else {
             deferred.reject(err);
          }
        }
    )
    //deferred.resolve(req.params);
    return deferred.promise;
}

function getDistinctSites() {    
    var deferred = Q.defer();
    //var insight = new Insight();
    Insight.find().distinct('site',function(err, result) {
      if(err) deferred.reject(err);
      deferred.resolve(result);
    });
    return deferred.promise;
}

function fetchDataFromPageSpeedApi(req) {    
  var deferred = Q.defer();
  if(req.url.indexOf('http') == -1){
    req.url = 'http://'.concat(req.url);
  }
  var query = ['url=' + req.url,'key=' + API_KEY , 'strategy=' + req.platform].join('&');
  var url = API_URL+query;
  // Create the HTTP Get.
  var request = https.get(url, function (response) {
    var data = '';
    // Create the listener for data being returned.
    response.on('data', function (chunk) {
      data += chunk;
    });

    // Create the listener for the end of the POST.
    response.on('end', function (){
      var dataJson = JSON.parse(data);
      if(dataJson.responseCode == undefined) {
        deferred.reject(dataJson.error.message);
      }else{
        deferred.resolve(dataJson);
      }
      
    });
  }).on("error", function(e){
    console.log("Got error: " + e.message);
    deferred.reject(e);
  })
  return deferred.promise;
}

function updateStatsObject(pageStats,pageSpeedData) {
 var stats = pageStats;
 var totalBytes = 0;
 for (var i = 0, len = RESOURCE_TYPE_INFO.length; i < len; ++i) {
   var field = RESOURCE_TYPE_INFO[i].field;
   if (field in stats) {
     var val = Number(stats[field]);
     totalBytes += val;
   }
 }
 pageSpeedData.pagePayload = service.byteConverstion(totalBytes,"up");
 pageSpeedData.htmlPayload = service.byteConverstion(pageStats["htmlResponseBytes"] , "up" );
 pageSpeedData.jsPayload = service.byteConverstion(pageStats["javascriptResponseBytes"] , "up" );
 pageSpeedData.cssPayload = service.byteConverstion(pageStats["cssResponseBytes"] , "up" );
 pageSpeedData.imagePayload = service.byteConverstion(pageStats["imageResponseBytes"] , "up" );
 pageSpeedData.jsCalls = pageStats["numberJsResources"];
 pageSpeedData.cssCalls = pageStats["numberCssResources"];
 pageSpeedData.imageCalls = pageStats["numberStaticResources"];
 
 return pageSpeedData;
}

 // <!--Helper that function sorts results in order of impact.-->
function sortByImpact(a, b) { return b.impact - a.impact; }
 
 // Convert byte according to scale and add label if required
function byteConverstion(value , scale , label){

 var unit = 1024

 value = (typeof(value) === "String") ? parseInt(value) : value ;

 value = (scale === "up" ) ? Math.round(value / unit ) : Math.round(value * unit);

 if(label!= undefined && label.length >= 0){value = value+label}

 return (value) ;
}
function getSuggestions(formattedResults) {
 var results = [];
 //var ulString = String('');
 var ruleResults = formattedResults["ruleResults"];
 for (var i in ruleResults) {
   var ruleResult = ruleResults[i];
   // Don't display lower-impact suggestions.
   if (ruleResult["ruleImpact"] < 3.0) continue;
   results.push({name: ruleResult["localizedRuleName"],
                 impact: parseFloat(parseFloat(ruleResult["ruleImpact"]).toFixed(2))
             });
 }
 return results.sort(service.sortByImpact);
}

// agenda.define('fetch pagespeed data', function(job, done) {
//   create(config.NBT_AS_MOBILE);
//   done();
// });
// agenda.on('start', function(job) {
//   console.log("Job %s starting", job.attrs.name);
// });
// agenda.on('complete', function(job) {
//   console.log("Job %s finished", job.attrs.name);
// });
// agenda.on('fail:fetch pagespeed data', function(err, job) {
//   console.log("Job failed with error: %s", err.message);
// });
// agenda.on('ready',function() {
  //var scheduledPush = agenda.create(, {info: config.NBT_AS_MOBILE})
  //scheduledPush.repeatEvery('10 minutes').save();
  //agenda.every('*/2 * * * *','fetch pagespeed data'); 
  //agenda.start();
  /*agenda.cancel({name: 'fetch pagespeed data'}, function(err, numRemoved) {
  console.log(numRemoved)
  });*/
// });

// agenda.on('error',function(err) {
//   console.log('error returned in scheduler'+ err.message);
// });

