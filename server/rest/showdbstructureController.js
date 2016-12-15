(function () {
   'use strict';
   var db = require('./dao/utils').findDB();
   var utils = require('../utils/utils');
   var lim = 1000;


   var result = {};
   var res;
   var getObjStruct = function (obj) {
      var curstruct = {};
      if (typeof obj === 'object' && !Array.isArray(obj)) {
         curstruct = {type : 'object', properties : {}};
         for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
               curstruct.properties[i] = getObjStruct(obj[i]);
            }
         }
      }
      else if (Array.isArray(obj)) {
         curstruct.type = 'array';
         if (obj[0]) {
            curstruct.items = getObjStruct(obj[0]);
         }
      }
      else {
         curstruct.type = typeof obj;
      }
      curstruct.required = true;
      return curstruct;
   };
   var getRecordStructure = function (record) {
      delete record._id;
      delete record._rev;
      delete record.type;
      return getObjStruct(record);
   };

   var processRecords = function (records, cb) {
      for (var i = 0; i < records.length; i++) {
         if (records[i].id !== '_design/Views' && records[i].doc.type !== 'version' && records[i].doc.type !== 'attachment') {
            var type = records[i].doc.type;
            var structure = getRecordStructure(records[i].doc);
            var hash = utils.getMD5Hash(structure);
            if (!result[type]) {
               result[type] = {
                  hashes : {},
                  structures : {}
               };
            }
            result[type].hashes[hash] = result[type].hashes[hash] ? result[type].hashes[hash] + 1 : 1;
            result[type].structures[hash] = structure;
         }
      }
      cb();
   };

   var finalizeData = function () {
      var out = {};
      for (var type in result) {
         if (result.hasOwnProperty(type)) {

            var maxHash = null;
            for (var hash in result[type].hashes) {
               if (result[type].hashes.hasOwnProperty(hash) && (!maxHash || result[type].hashes[hash] > result[type].hashes[maxHash])) {
                  maxHash = hash;
               }
            }
            out[type] = {
               "type" : "array",
               "items" : result[type].structures[maxHash].properties
            };

         }
      }

      res.send(out);
   };
   var getRecords = function (offset) {
      /*jslint camelcase: false */
      db.list({include_docs : true, skip : offset, limit : lim}, function (err, body) {
         /*jslint camelcase: true */
         if (!err && body && body.rows && body.rows.length) {
            processRecords(body.rows, function () {
               getRecords(offset + lim);
            });
         }
         else {
            finalizeData();
         }
      });
   };
   module.exports = {
      GET : function () {
         res = arguments[1];
         getRecords(0);
      }
   };
})();