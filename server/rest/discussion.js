/*jslint node: true */
/*jslint camelcase: false */
(function () {
   'use strict';

   var q       = require('q');
   var _       = require('underscore');
   var db      = require('./dao/utils').findDB();
   var utils   = require('../utils/utils.js');
   var config  = require(__dirname + '/../utils/configReader.js');
   var studyCourse = require('./studyCourses.js');

   var _db     = {
      get      : q.nbind(db.get, db),
      insert   : q.nbind(db.insert, db),
      bulk     : q.nbind(db.bulk, db),
      destroy  : q.nbind(db.destroy, db),
      view     : q.nbind(db.view, db, 'Views')
   };

   var classDiscussionTemplate = [
      '_id',
      'discussionTaskId',
      'classId',
      'bookId',
      'locator',
      'topic',
      'description',
      'frozen',
      'createdAt',
      'modifiedAt',
      'frozenedAt',
      'author',
      'userRole',
      'type',
      'authorId'
   ];

   var classDiscussionMessageTemplate = [
      'messageId',
      'parentMessageId',
      'level',
      'classDiscussionId',
      'userId',
      'createdAt',
      'text',
      'userRole'
   ];

   var userClassDiscussionMessageTemplate = [
      'messageId',
      'classId',
      'informed',
      'reviewed',
      'userId',
      'level',
      'classDiscussionId',
   ];

   var userProfileTemplate = [
      'firstName',
      'lastName',
      'photo'
   ];

   function getClassDiscussion (classDiscussionId) {
      if (!classDiscussionId) {
         return _onError('No class discussion id');
      }
      return _db.get(classDiscussionId)
         .then(function onClassDiscussionGet (response) {
            return _.pick(response[0], classDiscussionTemplate);
         })
         .catch(_onError);
   }

   function persistClassDiscussion (_classDiscussion) {
      var classDiscussion = _.pick(_classDiscussion, classDiscussionTemplate);
      classDiscussion.type = 'ClassDiscussion';
      var userClassDiscussion;

      if (!classDiscussion._id) {
         return _onError('No class discussion id');
      }
      if (classDiscussion.frozen) {
         classDiscussion.frozen = JSON.parse(classDiscussion.frozen);
      }
      return _db.get(classDiscussion._id)
         .then(function onPersist (response) {
            _.defaults(classDiscussion, response[0]);
            return _db.insert(classDiscussion);
         }, function onGetFailed (err) {
            if (err.status_code !== 404) {
               throw err;
            }
            userClassDiscussion = {
               classDiscussionId : classDiscussion._id,
               type              : 'UserClassDiscussion',
               userId            : classDiscussion.authorId
            };
            return _db.bulk({docs: [classDiscussion, userClassDiscussion]});
         })
         .then(_onSuccess)
         .catch(_onError);
   }

   function removeClassDiscussion (classDiscussionId) {
      return _db.get(classDiscussionId)
         .then(function onDbGet (response) {
            return _db.destroy(classDiscussionId, response[0]._rev);
         })
         .then(function onRemove () {
            return _db.view('classDiscussionMessages', { //need more obvious view name mb?
               key : classDiscussionId,
               include_docs : true
            });
         })
         .spread(function onMessagesRemove (response) {
            var messages = response.rows.map(function (row) {
               return {
                  _id      : row.id,
                  _rev     : row.value.rev,
                  _deleted  : true
               };
            });
            return _db.bulk({ docs : messages });
         })
         .thenResolve(classDiscussionId)
         .catch(_onError);
   }

   function createDiscussionsForClass (classId) {
      return _db.get(classId)
         .spread(function onGetClassInfo (studyClass) {
            var publicationId = studyClass.publicationId;
            return isBasedOnStudyCourse(studyClass) ? studyCourse.getStudyCourse(publicationId) : publicationId;
         })
         .then(function onGetPublicationsIds (response) {
            var publicationsIds = [];
            if (_.isObject(response)) {
               publicationsIds = response.studyCourseItems
                  .map(function (item) {
                     return item.studyGuideId;
                  })
                  .filter(Boolean);
            }
            else {
               publicationsIds = [response];
            }
            return _db.view('discussionTasksByPublicationId', {keys: publicationsIds});
         })
         .then(function onBulkClassDiscussions (response) {
            var discussions = response[0].rows.map(function (row) {
               var discussion = _.pick(row.value, ['locator', 'topic', 'description']);
               return _.extend(discussion, {
                  type        : 'ClassDiscussion',
                  classId     : classId,
                  bookId      : row.key,
                  createdAt   : Date.now(),
                  discussionTaskId : row.value._id
               });
            });
            return _db.bulk({ docs : discussions });
         })
         .catch(_onError);
   }

   function searchClassDiscussions (classId, bookId, userId) {
      var classDiscussions = {};
      var queryParams = {
         include_docs : true
      };
      if (bookId) {
         queryParams.key = [classId, bookId];
      }
      else {
         queryParams.startkey = [classId];
         queryParams.endkey = [classId, {}];
      }
      return _db.view('classDiscussions', queryParams)
         .then(function onSearchDiscussions (response) {
            classDiscussions = _.indexBy(_.map(response[0].rows, function (row) {
               var discussion = _.pick(row.doc, classDiscussionTemplate);
               discussion.messages = [];
               return discussion;
            }), '_id');
            return _db.view('classDiscussionMessages', {
               keys : _.keys(classDiscussions),
               include_docs : true
            });
         })
         .then(function onMessagesGet (response) {
            response[0].rows.forEach(function (row) {
               var message = _.pick(row.value, classDiscussionMessageTemplate);
               message.userProfile = _.pick(row.doc, userProfileTemplate);
               classDiscussions[row.key].messages.push(message);
            });
            classDiscussions = _.values(classDiscussions);
            return classDiscussions;
         })
         .then(function onUserMessagesGet (classDiscussions) {
            if ( !classDiscussions.length ) {
               return [];
            }
            return _db.view('userClassDiscussionMessages', {
               startkey : [userId],
               endkey : [userId, {}],
               include_docs : true
            })
            .spread(function (response) {
               var userMessagesById = _.reduce(response.rows,
                  function (_result, _row) {
                     _result[_row.key[1]] = _row.doc;
                     return _result;
                  }, {});
               return _.map(classDiscussions, function (_d) {
                  _d.messages = _.map(_d.messages, function (_m) {
                     return _.defaults(_m, userMessagesById[_m.messageId]);
                  });
                  return _d;
               });
            });
         })
         .catch(_onError);
   }

   function searchUserClassDiscussions (_userId /*, _itemsCount*/) {
      var discussionsById                 = {};
      var activeUserDiscussionIds         = [];
      var userClassDiscussionMessagesById = {};
      var queryParams                     = {
         startkey     : [_userId],
         endkey       : [_userId, {}],
         include_docs : true
      };

      return _db.view('userClassDiscussionMessages', queryParams)
         .spread(function (response) {
            _.each(response.rows, function (_row) {
               activeUserDiscussionIds.push(_row.doc.classDiscussionId);
               userClassDiscussionMessagesById[_row.doc.messageId] = _row.doc;
            });
            activeUserDiscussionIds = _.uniq(activeUserDiscussionIds);
            return _db.view('classDiscussionsById', {keys: activeUserDiscussionIds, include_docs: true});
         })
         .spread(function (response) {
            _.each(response.rows, function (_row) {
               _.extend(_row.doc, {
                  numberOfUnreadMessages : 0,
                  messages               : []
               });
               if ( _.indexOf(activeUserDiscussionIds, _row.doc._id) !== -1 ) {
                  discussionsById[_row.doc._id] = _row.doc;
               }
            });
            return _db.view('classDiscussionMessages', {keys: activeUserDiscussionIds, include_docs: true});
         })
         .spread(function (response) {
            _.each(response.rows, function (_row) {
               var classDiscussionId = _row.value.classDiscussionId;
               var userMessage = userClassDiscussionMessagesById[_row.value.messageId];
               if ( !userMessage || (userMessage && !userMessage.reviewed) ) {
                  discussionsById[classDiscussionId].numberOfUnreadMessages++;
               }
               if ( userMessage ) {
                  _row.value.reviewed = userMessage.reviewed;
                  _row.value.informed = userMessage.informed;
               }
               _row.value.userProfile = _.pick(_row.doc, userProfileTemplate);
               discussionsById[classDiscussionId].messages.push(_row.value);
            });
            return _.filter(_.values(discussionsById), function (_dc) {
               return _dc.numberOfUnreadMessages > 0;
            });
         });
   }

   function setClassDiscussionState (classDiscussionId, frozen) {
      if (!classDiscussionId) {
         return _onError('No class discussion id');
      }
      return _db.get(classDiscussionId)
         .then(function onDbGet (response) {
            response[0].frozen = !!frozen && JSON.parse(frozen);
            if (frozen) {
               response[0].frozenedAt = Date.now();
            }
            return _db.insert(response[0]);
         })
         .then(_onSuccess)
         .catch(_onError);
   }

   function updateUserDiscussionMessagesState (classDiscussionIds, reviewed, informed, userId) {
      if ( !classDiscussionIds.length ) {
         return _onSuccess('No class discussion ids for update');
      }
      var userClassDiscussionMessages = [];
      var classDiscussionMessages     = [];
      return _db.view('classDiscussionMessages', {
         keys : classDiscussionIds,
         include_docs : true
      })
      .spread(function onUserClassDiscussionMessagesGet (response) {
         classDiscussionMessages = _.map(response.rows, function (row) {
            return row.value;
         });
         var keys = _.map(classDiscussionMessages, function (_d) {
            return [userId,  _d.messageId];
         });
         return _db.view('userClassDiscussionMessages', {
            keys : keys,
            include_docs : true
         });
      })
      .spread(function onUserClassDiscussionMessagesUpdate (response) {
         var _response = _.map(response.rows, function(_r) {
            return _r.doc;
         });
         userClassDiscussionMessages = _.values(_.defaults(_.indexBy(_response, 'messageId'), _.indexBy(classDiscussionMessages, 'messageId')));
         userClassDiscussionMessages = _.map(userClassDiscussionMessages, function (_mes) {
            var message = {
               type              : 'UserClassDiscussionMessage',
               messageId         : _mes.messageId,
               reviewed          : reviewed,
               informed          : informed,
               userId            : userId,
               classDiscussionId : _mes.classDiscussionId
            };

            if ( _mes._id && _mes._rev ) {
               message._id = _mes._id;
               message._rev = _mes._rev;
            }
            return message;
         });
         return _db.bulk({ docs : userClassDiscussionMessages });
      })
      .catch(_onError);
   }

   //messages
   function searchDiscussionMessages (classId, classDiscussionId) {
      var classDiscussion = {};
      if (!classDiscussionId) {
         return _onError('No class discussion id ' + classId);
      }
      return getClassDiscussion(classDiscussionId)
         .then(function onGetClassDiscussion (response) {
            classDiscussion = response;
            return _db.view('classDiscussionMessages', {
               key : classDiscussionId,
               include_docs : true
            });
         })
         .then(function onMessagesGet (response) {
            classDiscussion.messages = response[0].rows.map(function (row) {
               var message = _.pick(row.value, classDiscussionMessageTemplate);
               message.userProfile = _.pick(row.doc, userProfileTemplate);
               return message;
            });
            return classDiscussion;
         })
         .catch(_onError);
   }

   function persistDiscussionMessage (_classDiscussionMessage) {
      var classDiscussionMessage = _.pick(_classDiscussionMessage, classDiscussionMessageTemplate); //?
      var userClassDiscussionMessage = _.defaults(_.pick(_classDiscussionMessage, userClassDiscussionMessageTemplate), {
         reviewed : true,
         informed : true,
         type     : 'UserClassDiscussionMessage'
      });
      if (!classDiscussionMessage.messageId) {
         return _onError('No class discussion message id');
      }
      if (!classDiscussionMessage.classDiscussionId) {
         return _onError('No class discussion id');
      }

      classDiscussionMessage.type = 'ClassDiscussionMessage';
      classDiscussionMessage.createdAt = Date.now();
      classDiscussionMessage._id = classDiscussionMessage.messageId;
      delete classDiscussionMessage.messageId;

      return _db.get(classDiscussionMessage.classDiscussionId)
         .then(function onGetClassDiscussion (response) {
            if (!!response[0].frozen) {
               throw 'Sorry, class discussion was frozened';
            }
            return _db.get(classDiscussionMessage._id);
         }, function onGetFailed (err) {
            throw err.status_code === 404 ? 'Sorry, class discussion was removed' : err;
         })
         .then(function onPersist (response) {
            _.defaults(classDiscussionMessage, response[0]);
            return _db.bulk({docs: [classDiscussionMessage, userClassDiscussionMessage]});
         }, function onGetFailed (err) {
            if (err.status_code !== 404) {
               throw err;
            }
            return _db.view('userClassDiscussions', {
               key: [_classDiscussionMessage.userId, _classDiscussionMessage.classDiscussionId],
               include_docs: true
            })
            .spread(function(response) {
               if ( !response.rows.length ) {
                  var userClassDiscussion = {
                     type              : 'UserClassDiscussion',
                     userId            : _classDiscussionMessage.userId,
                     classDiscussionId : _classDiscussionMessage.classDiscussionId
                  };
                  return _db.bulk({docs: [classDiscussionMessage, userClassDiscussionMessage, userClassDiscussion]});
               }
               else {
                  return _db.bulk({docs: [classDiscussionMessage, userClassDiscussionMessage]});
               }
            });
         })
         .then(_onSuccess)
         .catch(_onError);
   }

   //helpers
   function _onError (err) {
      var errMsg = err.description || err;
      return q.reject(utils.addSeverityResponse(errMsg, config.businessFunctionStatus.error));
   }

   function _onSuccess (response) {
      return response.id || typeof response[0] === 'object' && response[0].id || 'Ok';
   }

   function isBasedOnStudyCourse (studyClass) {
      return studyClass.publicationType === 'StudyCourse';
   }

   module.exports = {
      getClassDiscussion                : getClassDiscussion,
      persistClassDiscussion            : persistClassDiscussion,
      removeClassDiscussion             : removeClassDiscussion,
      searchClassDiscussions            : searchClassDiscussions,
      setClassDiscussionState           : setClassDiscussionState,
      searchDiscussionMessages          : searchDiscussionMessages,
      persistDiscussionMessage          : persistDiscussionMessage,
      createDiscussionsForClass         : createDiscussionsForClass,
      updateUserDiscussionMessagesState : updateUserDiscussionMessagesState,
      searchUserClassDiscussions        : searchUserClassDiscussions
   };
})();