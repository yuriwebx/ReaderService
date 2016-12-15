/*jslint node: true */
/*jslint camelcase: false */
'use strict';
var logger = require('../utils/logger.js').getLogger(__filename);
var materials = require('./materials.js');
var applicationSession = require('./bl/applicationSessions');

function _process(req, res, callback) {
   var runId = req.headers['x-run-id'] || '';
   var params = [].slice.call(arguments, 3);

   applicationSession.getUserId(runId)
      .then(function _onGetUserId(userId) {
         params.unshift(userId);
         return callback.apply(null, params);
      })
      .then(function _onSuccess(response) {
         res.send(response);
      })
      .catch(function _onError(err) {
         res.send(err);
      });
}

module.exports = {
   GET: {
      fetch: function(req, res) {
         _process(req, res,materials.fetch, req.query);
      },
      export: function(req, res) {
         _process(req, res, materials.export, req.query);
      },
      exercises: function(req, res){
         materials.getExercises(req.query).then(function(data) {
            res.send(data);
         }, function(err) {
            logger.error(err);
            res.send([]);
         });
      }
   },
   POST: {
      update: function(req, res) {
         _process(req, res, materials.update, req.body);
      },
      import: function(req, res) {
         _process(req, res, materials.import, req.body);
      }
   }
   /*,
    DELETE: {},
    PUT:{}*/
};