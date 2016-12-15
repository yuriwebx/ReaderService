/*jshint unused: vars*/
/*jslint node: true */
/*jslint camelcase: false */
(function () {
   'use strict';
   var config = require(__dirname + '/../utils/configReader.js');
   var utils = require('../utils/utils.js');
   var q = require('q');
   var _ = require('underscore');

   var db = require('./dao/utils').findDB();
   var deferredDbInsesrt = q.nbind(db.insert, db);
   var deferredDbView = q.nbind(db.view, db, 'Views');
   var deferredBulkInsert = q.nbind(db.bulk, db);

   var getPublicationById = function(uid, publicationId) {
      var dbQueryParams = {
         key: [uid, publicationId],
         include_docs: true
      };
      return deferredDbView('userpublicationsByUidAndPublicationId', dbQueryParams)
      .spread(function(userPublicationRaw){
         var userPublication = _.first(userPublicationRaw.rows) || {};
         return userPublication.doc;
      });
   };

   function getPublicationSummaryById(userId, publicationId) {
      var publicationSummary = {};
      return getPublicationById(userId, publicationId)
         .then(function(_userPublication) {
            publicationSummary = _userPublication;
            return getStudyProgress(userId, [publicationId], 'userStudiesPublication', 'publicationId', {});
         })
         .then(function(studyProgress) {
            if (studyProgress[publicationId]) {
               publicationSummary.readingProgress = studyProgress[publicationId].readingProgress;
               publicationSummary.readingDuration = studyProgress[publicationId].readingDuration;
            }
            return publicationSummary;
         });
   }

   var updateUserPublicationByUserIds = function(uids, publicationId, userData){

      var keys = _.map(uids, function(uid){
         return [uid, publicationId];
      });
      var dbQueryParams = {
         keys: keys,
         include_docs: true
      };
      return deferredDbView('userpublicationsByUidAndPublicationId', dbQueryParams)
      .spread(function(userPublications){
         var updatedUserPuplicationsDict = {};
         _.each(userPublications.rows, function(userPublication){
            if(!_.has(updatedUserPuplicationsDict,userPublication.doc.userId)) {
               updatedUserPuplicationsDict[userPublication.doc.userId] = {};
            }
            updatedUserPuplicationsDict[userPublication.doc.userId][userPublication.doc.publicationId] = userPublication.doc;
         });
         var updatedUserPuplications = _.map(uids, function(uid){
            var userPublications = updatedUserPuplicationsDict[uid];
            var userPublication = userPublications ? userPublications[publicationId] : false;
            userData.userId = uid;
            return userPublicationUpdateRule(userPublication, userData);
         });
         return deferredBulkInsert({
            docs: updatedUserPuplications
         });
      })
      .then(function(response){
         return response;
      })
      .catch(function(err) {
         return err;
      });
   };

   var userPublicationUpdateRule = function(currentUserPublication, userData){
      var now = Date.now();
      var defaultValue = {
         readingDuration   : 0,
         readingProgress   : 0,
         completed         : false,
         personal          : false,
         type              : 'UserPublication',
         lastOpenedAt      : now,
         firstOpenedAt     : now
      };
      if (!currentUserPublication) {
         if (userData.lastOpenedAt) {
            userData.firstOpenedAt = userData.lastOpenedAt;
         }
         _.defaults(userData, defaultValue);
      }
      else {
         _.defaults(userData, currentUserPublication);
      }
      userData.lastOpenedAt = now;
      return userData;
   };

   var updateUserPublication = function(userId, userData, isEditor) {
      userData.userId = userId;

      return getPublicationById(userId, userData.publicationId)
      .then(function(userPublication) {
         userData = userPublicationUpdateRule(userPublication, userData, isEditor);
         return deferredDbInsesrt(userData);
      })
      .then(function(){
         var numberOfRecentBooks = 1;
         return getRecentBooks(userId, numberOfRecentBooks, isEditor);
      })
      .then(function(recentBooks){
         return recentBooks.lastItem;
      })
      .catch(function(err) {
         return err;
      });
   };

   var getUserPublications = function (userId, limit, skip) {
      var deferred      = q.defer();
      var dbQueryParams = {
         include_docs   : true,
         startkey       : [userId],
         endkey         : [userId, {}]
      };
      if (limit) {
         dbQueryParams.limit = limit;
      }
      if (skip) {
         dbQueryParams.skip = skip;
      }
      db.view_with_list('Views', 'userpublicationsByUidAndPublicationId', 'userpublicationsListAsMap', dbQueryParams, function(err, body) {
         if (err) {
            deferred.reject(err);
         }
         else {
            deferred.resolve(body);
         }
      });

      return deferred.promise;
   };

   var getPersonalPublications = function(userId) {
      return q.ninvoke(db,
         'view',
         'Views',
         'userpublicationsOnlyPersonal',
         {key : userId})
      .then(function onDbView(response) {
         return _.reduce(response[0].rows, function(result, row) {
            result[row.value] = true;
            return result;
         }, {});
      })
      .catch(function onErr(err) {
         return err;
      });
   };

   var getRecentItem = function(userId, key, numberOfRecentBooks) {
      var deferred = q.defer();
      var recentBooks = [];
      var dbQueryParams = {
         endkey: [userId, key],
         startkey: [userId, key, {}],
         descending: true,
         include_docs: true
      };
      if(numberOfRecentBooks) {
         dbQueryParams.limit = numberOfRecentBooks;
      }
      db.view('Views', 'userpublicationsRecentPublication', dbQueryParams, function(err, body) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
         else {
            if(body.rows) {
               body.rows
                  .filter(function (row) {
                     return (row.value && row.value._id) &&
                        (row.doc && (row.doc.type === 'Book' ? row.doc.status : true));
                  })
                  .forEach(function (row) {
                     var progress = !isNaN(parseInt(row.value.progress, 10)) ? parseInt(row.value.progress, 10) : 0;
                     var item = {
                        _id : row.doc._id,
                        name : row.doc.name,
                        author : row.doc.author || 'Study class',
                        cover : row.doc.cover || row.doc.publicationId,
                        type : row.doc.type,
                        collection : row.doc.collection,
                        difficulty : +row.doc.difficulty,
                        progress : progress,
                        readingTime : row.doc.readingTime || row.doc.expectedDuration,
                        lastReadingTime : row.key[2],
                        classId : row.doc.classId,
                        currentStudyItemId : row.value.currentStudyItemId,
                        currentStudyGuideId : row.value.currentStudyGuideId,
                        publicationType    : row.doc.publicationType || row.doc.type
                     };
                     if (row.doc.type === 'StudyCourse' ||
                        ((row.doc.publicationType === 'StudyCourse' || !row.doc.publicationType) && !row.doc.cover)) {
                           delete item.cover;
                     }
                     if (row.value.readingPosition) {
                        item.readingPosition = row.value.readingPosition;
                     }
                     recentBooks.push(item);
                  });
            }
            deferred.resolve(recentBooks);
         }
      });

      return deferred.promise;
   };

   var getClassObjectType = function(infoClass){
      var type = '';
      if(infoClass.doc.type === 'StudyClass'){
         type = infoClass.doc.type;
      }
      else if(infoClass.doc.type === 'UserProfile'){
         type = 'Teacher';
      }
      return type;
   };

   var getStudyActivitiesAuthor = function(classIds) {
      var deferred = q.defer();
      var classInfo = {};
      db.view('Views', 'studyclassInfoByClassId', { keys : classIds ,include_docs: true}, function(err, infoClasses) {
         if(err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
         else if(infoClasses.rows.length !== 0) {
            var type = '';
            _.each(infoClasses.rows, function(infoClass){
               if(infoClass && infoClass.doc) {
                  type = getClassObjectType(infoClass);
                  if (!_.has(classInfo, type)) {
                     classInfo[type] = [infoClass];
                  }
                  else if (_.has(classInfo, type)) {
                     classInfo[type].push(infoClass);
                  }
               }
            });
            deferred.resolve(classInfo);
         }
         else {
            deferred.resolve(classInfo);
         }
      });
      return deferred.promise;
   };

   function getStudyProgress(userId, ids, viewName, param, studyProgress) {
      var deferred = q.defer();
      var dbQueryParams = {
         keys: [],
         include_docs: true
      };
      var keys = _.map(ids, function(id){
         return [userId, id];
      });
      dbQueryParams.keys = keys;
      db.view('Views', viewName, dbQueryParams, function(err, userStudys) {
         if(err){
            deferred.reject(utils.addSeverityResponse(err.description + ' in get study progress.',config.businessFunctionStatus.error));
         }
         else if(userStudys.rows && userStudys.rows.length !== 0) {
            _.each(userStudys.rows, function(userStudy){
               var currentStudyItemIndex = userStudy.doc.studyItems && userStudy.doc.currentStudyItemId ?
                                           _.pluck(userStudy.doc.studyItems, 'id').indexOf(userStudy.doc.currentStudyItemId) :
                                           -1;
               studyProgress[userStudy.doc[param]] = {
                  readingProgress   : userStudy.doc.readingProgress,
                  readingDuration   : userStudy.doc.readingDuration
               };
               if(currentStudyItemIndex !== -1){
                  studyProgress[userStudy.doc[param]].currentStudyItem = userStudy.doc.studyItems[currentStudyItemIndex];
               }
               else{
                  studyProgress[userStudy.doc[param]].currentStudyItem = {};
               }
            });
            deferred.resolve(studyProgress);
         }
         else{
            deferred.resolve(studyProgress);
         }
      });
      return deferred.promise;
   }

   var findLast = function(recentItems){
      if(recentItems.books &&  recentItems.books[0] && recentItems.studyActivities && recentItems.studyActivities[0]) {
         return recentItems.books[0].lastReadingTime > recentItems.studyActivities[0].lastReadingTime  ? recentItems.books[0] : recentItems.studyActivities[0];
      }
      else if(recentItems.books &&  recentItems.books[0]) {
         return recentItems.books[0];
      }
      else if(recentItems.studyActivities && recentItems.studyActivities[0]) {
         return recentItems.studyActivities[0];
      }
      else {
         return {};
      }
   };

   function getStudyGuideBookInfo(studyGuideIds) {
      var deferred = q.defer();
      var dbQueryParams = {
            keys: [],
            include_docs: true
         },
         studyGuidesInfo = {};
      dbQueryParams.keys = studyGuideIds;
      db.view('Views', 'studyGuidePublication', dbQueryParams, function(err, books) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description + ' in get study guide meta information.', config.businessFunctionStatus.error));
         }
         else {
            _.each(books.rows, function(book) {
               studyGuidesInfo[book.value.studyGuideId] = {
                  cover: book.doc.cover
               };
            });
         }
         deferred.resolve(studyGuidesInfo);
      });
      return deferred.promise;
   }

   function UserProfileInfo(userData) {
      this.userId = userData._id;
      this.email  = userData.email;
      this.lastName = userData.lastName;
      this.firstName = userData.firstName;
      this.photo = userData.photo || false;
      this.editorRole = userData.editorRole;
      this.adminRole = userData.adminRole;
      this.active = userData.active;
   }

   function getEditorsUserProfiles(studyGuideIds) {
      var deferred = q.defer();
      var dbQueryParams = {
            keys: [],
            include_docs: true
         };
      dbQueryParams.keys = studyGuideIds;
      db.view('Views', 'userProfileByStudyGuideId', dbQueryParams, function(err, editors){
         var studyGuidesInfo = {};
         if(err) {
            deferred.reject(utils.addSeverityResponse(err.description + ' in get study guide meta information.',config.businessFunctionStatus.error));
         }
         else{
            studyGuidesInfo = _.reduce(editors.rows, function (studyGuidesInfo, editor) {
               var studyGuideId = editor.key;
               if (!_.has(studyGuidesInfo, studyGuideId)) {
                  studyGuidesInfo[studyGuideId] = {};
               }
               if (!_.has(studyGuidesInfo[studyGuideId], editor.value.status)) {
                  studyGuidesInfo[studyGuideId][editor.value.status] = [];
               }
               studyGuidesInfo[studyGuideId][editor.value.status].push(new UserProfileInfo(editor.doc));
               return  studyGuidesInfo;
            }, {});
         }
         deferred.resolve(studyGuidesInfo);
      });

      return deferred.promise;
   }

   var getPublicationInfo = function(publicationIds){
      var deferred = q.defer();
      var dbQueryParams = {
         keys: publicationIds,
         include_docs: true
      };
      db.view('Views', 'publicationsGetActive', dbQueryParams, function(err, publications) {
         var publicationInfo = {};
         if(!err && publications.rows) {
            _.each(publications.rows, function (publication) {
               publicationInfo[publication.doc._id] = publication.doc;
            });
         }
         deferred.resolve(publicationInfo);
      });
      return deferred.promise;
   };

   var getRecentBooks = function(userId, numberOfRecentBooks, isEditor) {
      var publicationKey =  JSON.parse(isEditor || 'false') ? 2 : 1; //1 - books, 2 - editor  publication StudyGuide, StudyCourse 
      var studyActiveKey = 0;
      var recentItems = {};
      var _classIds = [];
      var _studyProgress = {};
      var _studyClasses = [];
      var _publications = [];
      return q.all([getRecentItem(userId, publicationKey, numberOfRecentBooks),
                    getRecentItem(userId, studyActiveKey, numberOfRecentBooks)])
      .spread(function(publications, studyClasses) {
         _classIds = _.map(studyClasses, function(studyClass) {
            return studyClass.classId;
         });
         _studyClasses = studyClasses;
         _publications = publications;
         return getStudyActivitiesAuthor(_classIds);
      })
      .then(function(classInfo) {
         var teachersProfile = classInfo.Teacher;
         var classes         = classInfo.StudyClass;
         var acceptedStatus  = config.studyProjectConfig.membershipStatus.accepted,
             requestedStatus = config.studyProjectConfig.membershipStatus.requested;
         var studentIds      = _.map(classInfo.Student, function(student){
            if((student.doc.studentConfirmationStatus === acceptedStatus || student.doc.studentConfirmationStatus ===  requestedStatus) &&
               student.doc.teacherConfirmationStatus === acceptedStatus){
               return student.doc.classId;
            }
         });
         var viewName        = 'userStudiesStudyClass', param = 'classId';

         _.each(_classIds, function(classId, currentClassIndex){
            var classIds   = _.pluck(_.pluck(classes,'doc'),'_id'),
                groupStudent = _.groupBy(studentIds, function(studentId) {
                   return studentId === classId ? classId : undefined;
                });
            var classIndex = classIds.indexOf(classId);
            
            _studyClasses[currentClassIndex].author = _.map(teachersProfile, function (teacherProfile) {
               return teacherProfile.doc.firstName + ' ' + teacherProfile.doc.lastName;
            }).join(', ');

            if(classIndex !== -1){
               _studyClasses[currentClassIndex].classType = classes[classIndex].doc.classType;
               _studyClasses[currentClassIndex].allowDiscussions = classes[classIndex].doc.allowDiscussions;
            }
            if(groupStudent[classId]){
               _studyClasses[currentClassIndex].participant = groupStudent[classId].length;
            }
            else{
               _studyClasses[currentClassIndex].participant = 0;
            }
         });
         return getStudyProgress(userId , _classIds, viewName, param, _studyProgress);
      })
      .then(function(_studyProgress) {
         var publicationIds = [];
         _.each(_studyClasses, function(studyClass) {
            if (_studyProgress[studyClass.classId]) {
               studyClass.progress = _studyProgress[studyClass.classId].readingProgress;
               studyClass.readingDuration = _studyProgress[studyClass.classId].readingDuration;
               studyClass.progressNum =  _studyProgress[studyClass.classId].readingProgress ? Math.floor(_studyProgress[studyClass.classId].readingProgress / 15) : 0;
               if(_studyProgress[studyClass.classId].currentStudyItem.type === 'Book' ||
                  _studyProgress[studyClass.classId].currentStudyItem.type === 'StudyGuide'){
                  studyClass.currentStudyItem = {author : _studyProgress[studyClass.classId].currentStudyItem.author,
                                                 name  : _studyProgress[studyClass.classId].currentStudyItem.name};}
               else{
                  studyClass.currentStudyItem = _studyProgress[studyClass.classId].currentStudyItem.id;
                  publicationIds.push(_studyProgress[studyClass.classId].currentStudyItem.id);
               }
            }
         });
         return getPublicationInfo(publicationIds);
      })
      .then(function(_publicationInfo){
         _.each(_studyClasses, function(studyClass) {
            if(_publicationInfo[studyClass.currentStudyItem]){
               studyClass.readingTime = _publicationInfo[studyClass.currentStudyItem].readingTime;
               studyClass.currentStudyItem = {
                  author: _publicationInfo[studyClass.currentStudyItem].author,
                  name: _publicationInfo[studyClass.currentStudyItem].name
               };
            }
         });
         var studyGuideIds = [];
         _.each(_publications, function(publication){
            if(publication.type === 'StudyGuide'){
               studyGuideIds.push(publication._id);
            }
         });
         return q.all([getEditorsUserProfiles(studyGuideIds),
                       getStudyGuideBookInfo(studyGuideIds)]);
      })
      .spread(function(studyGuidesEditorsInfo, studyGuidesBookInfo) {
         var _publicationIds = [];
         _.each(_publications, function(publication) {
            var creator;
            var activeEditors;
            if (studyGuidesEditorsInfo[publication._id]) {
               creator = _.first(studyGuidesEditorsInfo[publication._id].Creator);
               creator = creator.firstName + ' ' +  creator.lastName;
               activeEditors = studyGuidesEditorsInfo[publication._id].Active;

               if (activeEditors && activeEditors.length !== 0) {
                  activeEditors = _.map(activeEditors, function (userProfileInfo) {
                     return userProfileInfo.firstName + ' ' +  userProfileInfo.lastName;
                  }).join(', ');
                  publication.author = creator + ', ' + activeEditors;
               }
               else {
                  publication.author = creator;
               }
            }
            if (studyGuidesBookInfo[publication._id]) {
               publication.cover = studyGuidesBookInfo[publication._id].cover;
            }
            _publicationIds.push(publication._id);
         });
         return getStudyProgress(userId , _publicationIds, 'userStudiesPublication', 'publicationId', {});
      })
      .then(function (userPublication){
         _.each(_publications, function(publication) {
            if (userPublication[publication._id]) {
               publication.progress = userPublication[publication._id].readingProgress;
               publication.readingDuration = userPublication[publication._id].readingDuration;
            }
         });
         recentItems = { books: _publications, studyActivities: _studyClasses };
         recentItems.lastItem = findLast(recentItems);
         return recentItems;
      })
      .catch(function(err) {
         return err;
      });
   };

   module.exports = {
      getPublicationById             : getPublicationById,
      getUserPublications            : getUserPublications,
      getPersonalPublications        : getPersonalPublications,
      updateUserPublication          : updateUserPublication,
      getRecentBooks                 : getRecentBooks,
      getPublicationSummaryById      : getPublicationSummaryById,
      getStudyProgress               : getStudyProgress,
      updateUserPublicationByUserIds : updateUserPublicationByUserIds
   };

}());