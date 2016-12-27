var express = require('express');
var ejs = require('ejs');
var app = express();
var bodyParser = require('body-parser');
var config = require('./config.json');
//var MongoClient = require('mongodb').MongoClient;
var morgan     = require('morgan');
// configure app
app.use(morgan('dev')); // log requests to the console

var server = app.listen(process.env.PORT || 3000, function () {
  console.log('Server listening at http://' + server.address().address + ':' + server.address().port);
});
//mongodb://admin:Dearkaka_78@ds141098.mlab.com:41098/page-performance
/*MongoClient.connect(config.connectionString, function(err, database) {
  if (err) return console.log(err)
  db = database;
  // start server
  var server = app.listen(process.env.PORT || 8080, function () {
      console.log('Server listening at http://' + server.address().address + ':' + server.address().port);
  });
})*/

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(express.static('public'))
app.set('views', __dirname + '/views');

// app.get('/', function(req, res) {
//   // db.collection('pagestats').find().toArray(function(err, result) {
//   //   if (err) return console.log(err)
//   //   res.render('index.ejs');
//   // })
//   res.render('index.ejs');
// })
app.use('/', require('./controllers/psController'));

