/*jslint node: true */
'use strict';
var publication             = require('./publication.js');
var applicationSession      = require('./bl/applicationSessions');
var fs                      = require('fs');
var _                       = require('underscore');

var config           = require(__dirname + '/../utils/configReader.js');
var logger           = require(__dirname + '/../utils/logger.js').getLogger(__filename);
var utils            = require('../utils/utils.js');
var libraryStructure = null;

// read library
try {
   var libraryStructure = fs.readFileSync(config.libraryDir + 'dirstructure.json');
   if (!libraryStructure) {
      throw (new Error('Library is not accessable in /rest/publicationController.js'));
   }
}
catch (e) {
   logger.error(e);
   process.exit();
}

function errorFilter(reason, res) {
   var message = 'session not active';
   reason = utils.addSeverityResponse(message, config.businessFunctionStatus.error, reason);
   res.send(reason);
}

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
   GET : {
      info : function (req, res) {
         var runId = req.headers['x-run-id'] || '';
         applicationSession.getUserId(runId).then(_onSuccessFilter).fail(_onErrorFilter);

         function _onSuccessFilter(uid) {
            publication.getAll(false, uid).then(function(publications) {
               res.send(publications);
            }, function(reason) {
               res.send(reason);
            });
         }

         function _onErrorFilter(reason) {
            errorFilter(reason, res);
         }
      },
      details : function (req, res) {
         var runId = req.headers['x-run-id'] || '';
         var _send = res.send.bind(res);
         var data = _.clone(req.query);
         applicationSession.getUserId(runId).then(_onSuccessFilter).fail(_onErrorFilter);

         function _onSuccessFilter(uid) {
            publication.GetPublicationDetails(uid, data).then(_send, _send);
         }

         function _onErrorFilter(reason, res) {
            errorFilter(reason, res);
         }
      },
      books: function(req, res) {
            publication.SearchBooks(req.query.bookName, req.query.category).then(function(response) {
               res.send(response);
            }, function(reason) {
               res.send(reason);
            });
      },
      search : function (req, res) {
         var runId = req.headers['x-run-id'] || '';

         applicationSession.getUserId(runId)
         .then(function(userId) {
            return publication.searchPublications(userId,
               req.query.filter,
               req.query.itemsCount,
               req.query.language,
               req.query.contentType,
               req.query.categories,
               req.query.personalPublications,
               req.query.collectionId);
         })
         .then(function(publications) {
            res.send(publications);
         })
         .catch(function(err) {
            res.send(err); //add severity response
         });
      },
      getBookInfo : function (req, res) {
         _process(req, res, publication.getBookInfo, req.query.id);
      },
      getStudyGuideInfo : function (req, res) {
         _process(req, res, publication.getStudyGuideInfo, req.query.id);
      },
      getCollectionInfo : function (req, res) {
         _process(req, res, publication.getCollectionInfo, req.query.id);
      },
      getStudyCourseInfo : function (req, res) {
         _process(req, res, publication.getStudyCourseInfo, req.query.id);
      },
      getRelatedPublications : function (req, res) {
         var runId   = req.headers['x-run-id'] || '';
         var type    =  'getRelatedPublications';
         if (req.query.isStudyGuide) {
            type = 'getRelatedPublicationsForStudyGuide';
         }
         applicationSession.getUserId(runId).then(_onSuccessFilter).fail(_onErrorFilter);

         function _onSuccessFilter() {
            publication[type](req.query.publicationId, req.query.includeThisPublication)
            .then(function(relatedPublications) {
               res.send(relatedPublications);
            }, _onErrorFilter);
         }

         function _onErrorFilter(reason) {
            errorFilter(reason, res);
         }
      },
      savestudyguide : function (req, res) {
         var publicationData = req.param("publicationData");
         publicationData = JSON.parse(publicationData);
         publication.get(publicationData.id).then(function (publ) {
            publ.name = publicationData.name;
            publ.description = publicationData.description;
            publication.set(publ).then(function () {
               res.send(true);
            }, function(reason) {
               res.send(reason);
            });
         });
      },
      allbooksinlibrary: function(req, res) {
         var runId = req.headers['x-run-id'] || '';

         applicationSession.getUserId(runId).then(_onSuccessFilter).fail(_onErrorFilter);

         function _onSuccessFilter(uid) {
            //TODO: set file exist
            var total = false;
            var csvData = 'Title,Author,Difficulty,Size,Category,sourceURL\n';
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=library.csv');

            publication.getAll(total, uid)
               .then(function(publications) {
                  // Title, Author, Difficulty, Size, Category, Gutenberg URL (or whatever src URL we have)
                  _.each(publications, function(publ) {
                     csvData += '"' + publ.name + '","' + publ.author + '",' + publ.difficulty +
                         ',' + publ.bookSize + ',"' + publ.category + '","' + (publ.sourceURL || 'no link') + '"\n';
                  });
                  res.send(csvData);
               },function () {
                  res.send(csvData);
               });
         }

         function _onErrorFilter(reason) {
            errorFilter(reason, res);
         }
      }
   },
   POST : {
      persistDefaultStudyGuide : function (req, res) {
         _process(req, res, publication.persistDefaultStudyGuide, req.body.bookId, req.body.defaultStudyGuideId);
      },
      persistCurrentStudyGuide : function (req, res) {
         _process(req, res, publication.persistCurrentStudyGuide, req.body.bookId, req.body.currentStudyGuideId);
      }
   }
};
