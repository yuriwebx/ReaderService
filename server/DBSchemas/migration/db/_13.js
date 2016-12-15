(function () {
   'use strict';

   var q = require('q');
   var db = require('../../../rest/dao/utils.js').findDB();
   var nanop = function () {
      var deferred = q.defer();
      var args = []; for(var i=0; i<arguments.length; i++){
         args.push(arguments[i]);
      }
      var func = args.shift();
      args.push(function (err, body) {
         if (err) {
            deferred.reject(err);
         }
         else {
            deferred.resolve(body);
         }
      });
      db[func].apply(db, args);
      return deferred.promise;
   };
   module.exports = {
      init : function () {
         var views;
         return nanop('get', '_design/Views').then(function (body) {
            views = body;
            body.views.temporary = {
               map : "function(doc){if (doc.type === 'studyclass' && doc.studyClassType === 'studyclass' && !doc.publicationType){emit(null, {_id:doc.publicationId})}}"
            };
            return nanop('insert', body, '_design/Views');
         }).then(function (insertedViews) {
            views._rev = insertedViews.rev;
            delete views.views.temporary;
            return nanop('view', 'Views', 'temporary', {include_docs : true});
         }).then(function (body) {
            var retData = {}, keys = [];
            body.rows.forEach(function (row) {
               retData[row.id] = row.doc.type;
               keys.push(row.id);
            });
            return nanop('list', {include_docs : true, keys : keys}).then(function (data) {
               var ret = [];
               data.rows.forEach(function (el) {
                  el.doc.publicationType = retData[el.id];
                  ret.push(el.doc);
               });
               return ret;
            });
         }).then(function (upd) {
            if(upd) {
               return nanop('bulk', {docs : upd});
            }
            else {
               return true;
            }
         }).then(function () {
            return nanop('insert', views);
         }).
            fail(function(err){
               throw(err);
            });


      }
   };
})();