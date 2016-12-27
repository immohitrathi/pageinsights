var config = require('../config.json');
var express = require('express');
var router = express.Router();
var psService = require('../services/psService');

router.post('/pagestats', createRecord);
router.get('/', getAllRecords);
router.get('/sites', getSites);
router.get('/bylabel/:label/:platform', getAllRecordsByLabel);
//router.put('/:_id', updateRecord);
//router.delete('/:_id', deleteRecord);

module.exports = router;

function createRecord (req , res) {
  psService.create(req.body)
        .then(function(record) {  
      if(record){ 
              res.send(record);
            }else {
                res.sendStatus(404);
            }
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}

function getAllRecords (req , res) {
  psService.getAll()
        .then(function(records) { 
      if(records){  
              res.json(records);
            }else {
                res.sendStatus(404);
            }
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}
function getAllRecordsByLabel (req , res) {
  psService.getAllRecordsByLabel(req)
        .then(function(records) { 
      if(records){  
              res.json(records);
            }else {
                res.sendStatus(404);
            }
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}
function getSites (req , res) {
  psService.getDistinctSites()
        .then(function(records) { 
      if(records){  
              res.json(records);
            }else {
                res.sendStatus(404);
            }
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}

function deleteRecord(req , res) {
    psService.deleteRecord(req.params._id)
        .then(function(){
            res.sendStatus(200);
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}

function updateRecord (req , res) {
    var userId = req.user.sub;
    psService.updateRecord(userId,req.body)
        .then(function(record){
            if(record){   
                res.send(record);
            }else {
                res.sendStatus(404);
            }
        })
        .catch(function (err) {
            res.status(400).send(err);
        });
}

