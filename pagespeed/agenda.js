var config = require('./config.json');
var Agenda = require('agenda');
var agenda = new Agenda({db: { address: config.connectionString, collection: 'jobs' }});
var jobTypes = require('./jobs.json');
jobTypes.forEach(function(job) {
  require('./jobs/fetchpsdata.js')(agenda,job);
})
agenda.on('start', function(job) {
	console.log("Job %s starting", job.attrs.name);
});
agenda.on('complete', function(job) {
		console.log("Job %s finished", job.attrs.name);
});
agenda.on('fail:'+job.name, function(err, job) {
   console.log("Job failed with error: %s", err.message);
});
agenda.on('ready',function() {
	console.log('ready')
  //var scheduledPush = agenda.create(, {info: config.NBT_AS_MOBILE})
  //scheduledPush.repeatEvery('10 minutes').save();
  //agenda.every('*/2 * * * *','fetch pagespeed data'); 
	  //agenda.start();
});

agenda.on('error',function(err) {
   console.log('error returned in scheduler'+ err.message);
});
module.exports = agenda;