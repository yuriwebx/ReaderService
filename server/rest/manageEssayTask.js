/*jslint node: true */
/*jslint camelcase: false */
(function () {
   'use strict';
   var q       = require('q');
   var _       = require('underscore');
   var db      = require('./dao/utils').findDB();
   var utils   = require('../utils/utils.js');
   var config  = require(__dirname + '/../utils/configReader.js');
   var publication = require('./publication.js');
   var essayTaskProps = ['_id', 'publicationId', 'locator', 'topic', 'wordsLimit', 'comment'];

   function persistEssayTask (essayTask) {
      var isModified = _.has(essayTask, 'modifiedAt');
      var currentTime = Date.now();
      var _essayTask = _.extend({
         type : 'EssayTask',
         modifiedAt : currentTime
      }, _.pick(essayTask, essayTaskProps));
      var action = isModified ? 'update' : 'add';

      return (isModified ? q.ninvoke(db, 'get', _essayTask._id) : q())
         .then(function (body) {
            if (_.isUndefined(body)) {
               _essayTask.createdAt = currentTime;
            }
            else {
               _essayTask = _.extend(body[0], _essayTask);
            }
            return q.ninvoke(db, 'insert', _essayTask);
         })
         .then(function () {
            return publication.persistExercises(_essayTask, action);
         })
         .then(function () {
            return _essayTask._id;
         })
         .catch(_onError);
   }

   function getEssayTask (id) {
      return q.ninvoke(db, 'get', id)
         .spread(function (body) {
            return body;
         })
         .catch(_onError);
   }

   function removeEssayTask (id) {
      var essayTask = null;
      var action = 'remove';

      return q.ninvoke(db, 'get', id)
         .spread(function (body) {
            essayTask = body;
            return q.ninvoke(db, 'destroy', body._id, body._rev);
         })
         .then(function () {
            return publication.persistExercises(essayTask, action);
         })
         .thenResolve(id)
         .catch(_onError);
   }

   function getEssayTasksList (data) {
      return q.ninvoke(db, 'view', 'Views', 'essayTasksByPublicationId', {
         include_docs : true,
         key : data.publicationId
      })
         .spread(function (body) {
            return _.map(body.rows, function (row) {
               return row.doc;
            });
         })
         .catch(_onError);
   }

   function _onError (err) {
      var errMsg = err.description || err;
      return q.reject(utils.addSeverityResponse(errMsg, config.businessFunctionStatus.error));
   }

   module.exports = {
      persistEssayTask  : persistEssayTask,
      getEssayTask      : getEssayTask,
      removeEssayTask   : removeEssayTask,
      getEssayTasksList : getEssayTasksList
   };
})();