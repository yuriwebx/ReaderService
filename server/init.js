/*jslint node: true */
/*jslint camelcase: false */
'use strict';

var publication = require('./rest/publication.js');
var defaultDataFolder = __dirname + "/DBSchemas";

var migrationTool = require(defaultDataFolder + '/migration/migration.js');
var fs = require('fs');
var _ = require('underscore');
var config = require(__dirname + '/utils/configReader.js');
var crypto = require('crypto');
var _str = require("underscore.string");
//var jsonValidator = require('amanda')('json');

var needAddPublicatins;
var db = require('./rest/dao/utils').findDB();
var logger = require(__dirname + '/utils/logger.js').getLogger(__filename);

logger.info('Init process started');

var publicationsTyps = {
   myPublications : 'MyPublications'
};

var defaultFields = {
   description: '',
   toc: [],
   wordsCount: 0,
   readingTime: 0,
   paraCount: 0,
   audio: false,
   wordsPerMinute: 0,
   bitRate: 0
};

function fillWithDefaultValues(doc){
   for(var i in defaultFields){
      if(defaultFields.hasOwnProperty(i))
      {
         if(!doc.hasOwnProperty(i)){
            doc[i] = defaultFields[i];
         }
      }
   }
}

function update(obj, key, callback) {
   db.get(key, function (error, existing) {
      if (!error) {
         obj._rev = existing._rev;
      }
      db.insert(obj, key, callback);
   });
}

function readLibrary(dict) {
   // read library
   var publ;
   try {
      var libraryStructure = fs.readFileSync(config.libraryDir + 'dirstructure.json');
      var jsonDirstruct = JSON.parse(libraryStructure.toString());
      if (!libraryStructure) {
         throw (new Error('Library is not accessable in /rest/publicationController.js'));
      }
      //return list or dict
      if (dict) {
         publ = {};
      }
      else {
         publ = [];
      }
      for (var key in jsonDirstruct) {
         if (jsonDirstruct.hasOwnProperty(key)) {
            for (var i = 0; i < jsonDirstruct[key].length; i++) {
               var doc = jsonDirstruct[key][i];
               doc._id = doc.fileName;
               doc.language = key;
               doc.status = true;
               doc.name = doc.originalFileName;
               doc.weight = doc.weight || 0;
               doc.difficulty = Math.round(parseFloat(doc.difficulty, 10) || 0);
               doc.readingTime = (doc.readingTime < 60000 ? 60000 : doc.readingTime) || 0;

               if (doc.version) {
                  doc.version = [doc.version];
                  doc.cover   = doc.version[0].cover;
               }

               delete doc.fileName;
               delete doc.originalFileName;
               if (!doc.type) {
                  doc.type = 'Book';
               }
               doc.type = _str.capitalize(doc.type);
               if (doc.type === 'Dictionary' || doc.type === 'Vocabulary') {
                  doc.status = false;
               }
               if (dict) {
                  publ[doc._id] = doc;
               }
               else {
                  publ.push(doc);
               }
            }
         }
      }
   } catch (e) {
      logger.error(e);
      process.exit();
   }
   return publ;
}
function initPublications() {   //set publications
   var dict = false;
   var publications = readLibrary(dict);
   publications.forEach(function(publication){
      fillWithDefaultValues(publication);
   });
   publication.setAll(publications).then(function () {
      logger.log('Library has been updated');
   });
}

var replaceDP = function (duplicatePublicationId, callback) { //delte
   if (duplicatePublicationId.length !== 0) {
      publication.deletePublication(duplicatePublicationId[0][0], duplicatePublicationId[0][1]).then(function () {
         if (duplicatePublicationId.length !== 1) {
            duplicatePublicationId.shift();
            replaceDP(duplicatePublicationId, callback);
         }
         else {
            callback();
         }
      });
   }
   else {
      callback();
   }
};

function updateMyPublications(replacedId, books) {
   var i;
   var j;
   var update = [];
   if (books && books.rows && books.rows.length) {
      for (i = 0; i < books.rows.length; i++) {
         for (j = 0; j < books.rows[i].doc.publications.length; j++) {
            if (replacedId.indexOf(books.rows[i].doc.publications[j]) !== -1) {
               books.rows[i].doc.publications[j] = 0; //TO DO set status false for deactivate publication
            }
         }
         books.rows[i].doc.publications = _.without(books.rows[i].doc.publications, 0);
         update.push(books.rows[i].doc);
      }
   }
   return update;
}

var updateFunctions = {};
updateFunctions[publicationsTyps.myPublications] = updateMyPublications;

function updatePublications() {
   var dict = true;
   var i;
   var j;
   var total = true;
   var replacedId = [];
   return publication.getAll(total).then(function (publications) {
      var publ = readLibrary(dict);
      var publId;
      var bookIdInStudyGuide;
      var usedId = [];
      var id;
      var rev;
      for (i = 0; i < publications.length; i++) {
         //set studyGuideId
         if (publications[i].hasOwnProperty('bookId')) {
            bookIdInStudyGuide = publications[i].bookId;
         }
         else {
            bookIdInStudyGuide = '';
         }
         if (publ.hasOwnProperty(publications[i]._id) || publ.hasOwnProperty(bookIdInStudyGuide)) {
            id = publications[i]._id;
            rev = publications[i]._rev;
            if (publ.hasOwnProperty(id)) {
               publications[i] = publ[id];
               usedId.push(publications[i]._id);
            }
            else {
               publications[i].hasThumbnail = publ[bookIdInStudyGuide].hasThumbnail;
               publications[i].totalSize = publ[bookIdInStudyGuide].totalSize;
               publications[i].mediaSize = publ[bookIdInStudyGuide].mediaSize;
               publications[i].bookSize = publ[bookIdInStudyGuide].bookSize;
               publications[i].wordsPerMinute = publ[bookIdInStudyGuide].wordsPerMinute || 0;
               publications[i].bitRate = publ[bookIdInStudyGuide].bitRate || 0;
            }
            publications[i]._id = id;
            publications[i]._rev = rev;
            if (publications[i].type !== 'Vocabulary' && publications[i].type !== 'Dictionary') {
               publications[i].status = true;
            }
         }
         else if (publications[i].type === 'StudyCourse') {
            publications[i].status = true;
         }
         else {
            replacedId.push(publications[i]._id);
            publications[i].status = false;
         }
         fillWithDefaultValues(publications[i]);
      }
      publId = Object.keys(publ);
      publId = _.uniq(_.difference(publId, usedId));
      for (i = 0; i < publId.length; i++) {
         publications.push(publ[publId[i]]);
      }
      for (i = 0; i < usedId.length; i++) {
         for (j = 0; j < publications.length; j++) {
            if (publications[j].bookId === usedId[i]) {
               publications[j].status = true;
            }
         }
      }
      publications.forEach(function(el){
         fillWithDefaultValues(el);
      });
      return publication.updateAll(publications);
   });
}


needAddPublicatins = true;
function initDB(data, isNew) {
   var views = false;
   if (data.views) {
      views = {language : "javascript", views : {}, lists : {}, _id : '_design/Views'};
      for (var v in data.views) {
         if (data.views.hasOwnProperty(v)) {
            views.views[v] = {"map" : data.views[v]};
            if (data.reduce && data.reduce[v]) {
               views.views[v].reduce = data.reduce[v];
            }
         }
      }
      if (data.lists) {
         for (var l in data.lists) {
            if (data.lists.hasOwnProperty(l)) {
               views.lists[l] = data.lists[l];
            }
         }
      }
   }
   if (isNew) {

      var ins = [];
      if (data.data && Array.isArray(data.data)) {
         ins = ins.concat(data.data);
      }
      if (views) {
         ins.push(views);
      }
      if (ins.length) {
         db.bulk({docs : ins}, function (err) {
            if (err) {
               logger.error('Error inserting data');
               logger.error(err);
            }
            else {
               logger.log('Schema "db" created');
               initPublications();
            }
         });
      }
      else {
         logger.log('Schema "db" created');
         initPublications();
      }
   }
   else {
      updatePublications().then(function () {
         db.get('_design/Views', {}, function (err, body) {
            var needUpdate = false;
            if (err || !body.views || !body.lists) {
               needUpdate = true;
            }
            else {
               needUpdate =
                  crypto.createHash('md5').update(JSON.stringify(body.views) || '').digest("hex") !==
                  crypto.createHash('md5').update(JSON.stringify(views.views) || '').digest("hex") ||
                  crypto.createHash('md5').update(JSON.stringify(body.lists) || '').digest("hex") !==
                  crypto.createHash('md5').update(JSON.stringify(views.lists) || '').digest("hex");
            }
            if (needUpdate) {
               update(views, '_design/Views', function (err) {
                  if (err) {
                     logger.log('Error updating views at schema "db"');
                     logger.log(err);
                  }
                  else {
                     logger.log('Views for schema "db" updated');
                  }
               });
            }
         });

      }).catch(function (err) {
         logger.error(err);
         logger.error('Exiting');
         setTimeout(process.exit, 10);
      });
   }

}

var processFile = function (data) {
   var json, err;
   try {
      json = JSON.parse(data.toString());
      migrationTool.checkSchemaVersion(json).then(
         function (isNew) {
            initDB(json, isNew);
         }
      ).fail(function (e) {
            logger.error('Error migrating at db');
            if (e) {
               logger.error(e);
            }
         });
   }
   catch (e) {
      err = e;
   }
   if (err) {
      logger.error('File "db.json" contains an error:\n' + err);
   }
};


var data = fs.readFileSync(defaultDataFolder + '/db.json');
if (data) {
   processFile(data);
}
else {
   logger.error('Error reading db.json');
}

