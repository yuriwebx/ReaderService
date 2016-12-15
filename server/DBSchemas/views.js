/* globals emit: false */
/* globals getRow: false */
/* globals toJSON: false */
(function () {
   "use strict";

   var convertToStrings = function (obj) {
      for (var meth in obj) {
         if (obj.hasOwnProperty(meth) && 'function' === typeof obj[meth]) {
            obj[meth] = obj[meth].toString();
         }
      }
      return obj;
   };

   module.exports = {
      views : convertToStrings({
         documentsByType : function (doc) {
            if (doc.type) {
               emit(doc.type, null);
            }
         },
         applicationSessionUserActivitySummary: function (doc) {
            if (doc.type === 'ApplicationSession' && doc.userId) {
               if (doc.status && Object.prototype.toString.call(doc.status.activities) === '[object Array]') {
                  doc.status.activities.forEach(function (activity) {
                     emit([activity.name, activity.relatedEntityId, doc.userId],
                      {
                        _id : doc.userId,
                        online : doc.status.online,
                        lastOnline : doc.status.lastStatusNotification,
                        actual : activity.actual,
                        lastActive : activity.lastActive
                      });
                  });
               }
            }
         },
         applicationSessionActive: function (doc) {
            var isOnline = doc.status && doc.status.online;
            if (doc.type === 'ApplicationSession' && isOnline) {
               emit(doc._id, doc.status.lastStatusNotification);
            }
         },
         userstudystatisticsByUid : function (doc) {
            if (doc.type === 'UserStudyStatistics') {
               emit(doc.userId, null);
            }
         },
         studyclassById : function (doc) {
             if (doc.type === 'StudyClass') {
                 emit([doc.classId, 0, doc.classId], null);
             }
             if (doc.type === 'ClassTeacher') {
                 emit([doc.classId, 1, doc.teacherId], null);
             }
             if (doc.type === 'ClassStudent') {
                 emit([doc.classId, 2, doc.studentId], null);
             }
         },

         studyclassByPublicationId : function (doc) {
            if (doc.type === 'StudyClass') {
               emit(doc.publicationId, null);
            }
         },
         studyclassTeachersAndStudentsById : function (doc) {
            if (doc.type === 'ClassStudent') {
               emit(doc.studentId, null);
            }
            if (doc.type === 'ClassTeacher') {
               emit(doc.teacherId, null);
            }
         },

         studyclassPublicationByClassId : function (doc) {
            if (doc.type === 'StudyClass') {
               emit(doc.classId, {
                  _id : doc.publicationId,
                  expectedDailyWork : doc.expectedDailyWork,
                  scheduledAt : doc.scheduledAt,
                  classType : doc.classType
               });
            }
         },
         studyclassInfoByClassId : function (doc) {
            if (doc.type === 'ClassTeacher' && doc.active) {
               emit(doc.classId, {
                  _id                : doc.teacherId,
                  classTeacherAction : doc.classTeacherAction
               });
            }
            else if (doc.type === 'StudyClass' || doc.type === 'ClassStudent') {
               emit(doc.classId, null);
            }
         },
         studyclassActiveUsersByClassId : function (doc) {
            if (doc.type === 'UserProfile' && doc.active) {
               emit('activeUser', null);
            }
            else if (doc.classId && (doc.studentId || (doc.teacherId && doc.active))) {
               emit(doc.classId, null);
            }
         },
         studyclassStudentByClassId : function (doc) {
            if (doc.type === 'ClassStudent' || doc.type === 'ClassTeacher') {
               emit(doc.classId, {
                  _id : doc.studentId || doc.teacherId,
                  registeredAt : doc.registeredAt,
                  modifiedAt : doc.modifiedAt,
                  teacherConfirmationStatus : doc.teacherConfirmationStatus,
                  studentConfirmationStatus : doc.studentConfirmationStatus
               });
            }
         },
         studyclassActionsByClassAndStudentId : function (doc) {
            if (doc.type === 'ClassStudent') {
               emit([doc.classId, doc.studentId], {_id : doc.studentId, classStudentAction : doc.classStudentAction});
            }
         },
         studyclassActionsByClassAndTeacherId : function (doc) {
            if (doc.type === 'ClassTeacher') {
               emit([doc.classId, doc.teacherId], {_id : doc.teacherId, classTeacherAction : doc.classTeacherAction});
            }
         },

         personalMessagesToUser : function (doc) {
            if (doc.type === 'PersonalMessage' || doc.type === 'ClassNotificationMessage' || doc.type === 'StudyGuideNotificationMessage') {
               emit([doc.toUserId, doc._id], null);
            }
         },
         searchPersonalMessages : function (doc) {
            if (doc.type === 'PersonalMessage' || doc.type === 'ClassNotificationMessage' || doc.type === 'StudyGuideNotificationMessage') {
               emit(doc.toUserId, null);
            }
         },

         studycourseItemByPublicationId : function (doc) {
            if (doc.type === 'StudyCourseItem' && doc.publicationId) {
               emit(doc.publicationId, null);
            }
         },

         flashcardsByUser : function (doc) {
            if ((doc.type === 'DictionaryTermStudy' || doc.type === 'FlashcardStudy') && doc.userId) {
               emit(doc.userId, null);
            }
         },
         flashcardsByUserAndId : function (doc) {
            if ((doc.type === 'DictionaryTermStudy' || doc.type === 'FlashcardStudy') && doc.userId) {
               emit([doc.userId, doc._id], null);
            }
         },
         flashcardsByUserAndTermName : function (doc) {
            if ((doc.type === 'DictionaryTermStudy' || doc.type === 'FlashcardStudy') && doc.userId && doc.termName) {
               emit([doc.userId, doc.termName], null);
            }
         },
         flashcardsByUserAndRunTime : function (doc) {
            if ((doc.type === 'DictionaryTermStudy' || doc.type === 'FlashcardStudy') && doc.userId) {
               emit([doc.userId, doc.nextRunAt], null);
            }
         },
         flashcardsByTestQuestionId : function (doc) {
            if (doc.type === 'FlashcardStudy') {
               emit(doc.testQuestionId, null);
            }
         },

         discussionTasksByPublicationId : function (doc) {
            if (doc.type === 'Material') {
               for (var i = 0, len = doc.discussionTasks.length; i < len; i++) {
                  emit(doc.bookId, doc.discussionTasks[i]);
               }
            }
         },
         classDiscussions : function (doc) {
            if (doc.type === 'ClassDiscussion') {
               emit([doc.classId, doc.bookId]);
            }
         },
         classDiscussionsById : function (doc) {
            if (doc.type === 'ClassDiscussion') {
               emit(doc._id);
            }
         },
         classDiscussionMessages : function (doc) {
            if (doc.type === 'ClassDiscussionMessage') {
               emit(doc.classDiscussionId, {_id: doc.userId, rev: doc._rev, level: doc.level, createdAt: doc.createdAt, text: doc.text, messageId: doc._id, parentMessageId: doc.parentMessageId, userRole: doc.userRole, classDiscussionId: doc.classDiscussionId});
            }
         },
         userClassDiscussions : function (doc) {
            if (doc.type === 'UserClassDiscussion') {
               emit([doc.userId, doc.classDiscussionId], null);
            }
         },
         userClassDiscussionMessages : function (doc) {
            if (doc.type === 'UserClassDiscussionMessage') {
               emit([doc.userId, doc.messageId], null);
            }
         },
         testByPublicationId : function (doc) {
            if (doc.type === 'Test' && doc.publicationId) {
               emit(doc.publicationId, null);
            }
         },
         testByPublicationAndTestId : function (doc) {
            if (doc.type === 'Test' && doc.publicationId && doc._id) {
               emit([doc.publicationId, doc._id], null);
            }
         },
         testByName : function (doc) {
            if (doc.type === 'Test' && doc.name) {
               emit(doc.name, null);
            }
         },
         testIdByAttachmentName : function (doc) {
            if (doc.type === 'Test' && doc._attachments) {
               for (var i in doc._attachments) {
                  if(doc._attachments.hasOwnProperty(i)) {
                     emit(i, doc._id);
                  }
               }
            }
         },
         testAndQuestionsById : function (doc) {
            if ((doc.type === 'FlashcardStudy' || doc.type === 'Test') && doc._id) {
               if (doc.type === 'Test') {
                  emit(doc._id, null);
               }
               else {
                  emit(doc.testId, null);
               }
            }
         },

         testQuestionsByTestId : function (doc) {
            if (doc.type === 'FlashcardStudy' && doc.testId) {
               emit(doc.testId, null);
            }
         },
         testQuestionsById : function (doc) {
            if (doc.type === 'FlashcardStudy' && doc._id) {
               emit(doc._id, null);
            }
         },

         essayTasksByPublicationId : function (doc) {
            if (doc.type === 'EssayTask' && doc.publicationId) {
               emit(doc.publicationId, null);
            }
         },
         exercisesList : function (doc) {
            if ((doc.type === 'EssayTask' ) || (doc.type === 'Test')) {
               emit([doc.publicationId, (doc.locator.paragraphId || doc.locator).substring(5)], null);
            }
         },
         usersEditors : function (doc) {
            if (doc.type === 'UserProfile' && doc.editorRole) {
               emit([doc.lastName, doc.firstName, doc.email], null);
            }
         },
         usersActiveUsers : function (doc) {
            if (doc.type === 'UserProfile' && doc.active === 'Approved') {
               emit([doc.lastName, doc.firstName, doc.email], null);
            }
         },
         usersInactiveUsers : function (doc) {
            if (doc.type === 'UserProfile' && doc.active === 'Declined') {
               emit([doc.lastName, doc.firstName, doc.email], null);
            }
         },
         usersAdministrators : function (doc) {
            if (doc.type === 'UserProfile' && doc.adminRole) {
               emit([doc.lastName, doc.firstName, doc.email], null);
            }
         },
         usersRegistered : function (doc) {
            if (doc.type === 'UserProfile' && doc.active === 'Registered') {
               emit([doc.lastName, doc.firstName, doc.email], null);
            }
         },
         usersByEmail : function (doc) {
            if (doc.type === 'UserProfile' && doc.email) {
               emit(doc.email, null);
            }
         },
         usersByUserId : function (doc) {
            if (doc.type === 'UserProfile' && doc._id) {
               emit(doc._id, doc);
            }
         },
         usersByOauth : function (doc) {
            if (doc.type === 'UserProfile' && doc.active) {
               for (var i = 0; i < doc.externaluserid.length; i++) {
                  emit(doc.externaluserid[i].authorizationProvider + '/' + doc.externaluserid[i].idFromAuthorizationProvider, doc);
               }
            }
         },
         userReports : function(doc){
            if(doc.type === 'UserReport'){
               emit(doc.added, null);
            }
         },
         userGetAllRelatedData : function (doc) {
            if (doc.userId || doc.type === 'UserProfile') {
               emit(doc.type === 'UserProfile' ? doc._id : doc.userId, {rev : doc._rev, type : doc.type});
            }
         },
         attachmentsById : function (doc) {
            if (doc._attachments) {
               emit(doc._id, null);
            }
         },

         userStudiesPublication : function (doc) {
            if (doc.type === 'UserStudy' && !doc.classId) {
               emit([doc.userId, doc.publicationId], null);
            }
         },
         userStudiesStudyClass : function (doc) {
            if (doc.type === 'UserStudy' && doc.classId) {
               emit([doc.userId, doc.classId], null);
            }
         },
         userStudiesProgress : function (doc) {
            if (doc.type === 'UserStudyProgress') {
               emit(doc.studyId, null);
            }
         },
         userStudiesSearch : function (doc) {
            if (doc.type === 'UserStudy') {
               emit(doc.classId, {_id : doc.userId, studyId : doc._id});
            }
         },

         emailtaskByTaskHashCode : function (doc) {
            if (doc.type === 'EmailAuthorizedTask' && doc.taskHashCode) {
               emit(doc.taskHashCode, null);
            }
         },
         emailtaskByEmail : function (doc) {
            if (doc.type === 'EmailAuthorizedTask' && doc.email && doc.taskType) {
               emit([doc.email, doc.taskType], null);
            }
         },
         emailtaskByUserId : function (doc) {
            if (doc.type === 'EmailAuthorizedTask' && doc.userId) {
               emit(doc.userId, null);
            }
         },
         emailtaskByConfirmationHashCode : function (doc) {
            if (doc.type === 'EmailAuthorizedTask' && doc.taskConfirmationHashCode) {
               emit(doc.taskConfirmationHashCode, null);
            }
         },

         userpublicationsByUidAndPublicationId : function (doc) {
            if (doc.type === 'UserPublication' && doc.userId && doc.publicationId) {
               emit([doc.userId, doc.publicationId], null);
            }
         },
         userStudyCollectStats : function (doc) {
            if (doc.type === 'UserStudy' && !doc.classId) {
               var cq = 0, pq = 0, mf = 0, pf = 0, items = doc.studyItems;
               for (var i = 0; i < items.length; i++) {
                  if (items[i].quizzes) {
                     for (var q in items[i].quizzes) {
                        items[i].quizzes[q].status === 'Completed' ? cq++ : pq++;
                     }
                  }
                  if (items[i].flashcards) {
                     for (var f in items[i].flashcards) {
                        items[i].flashcards[f].active ? mf++ : pf++;
                     }
                  }
               }
               emit(doc.userId, {rd : doc.readingDuration, cp : doc.completed, cq : cq, pq : pq, mf : mf, pf : pf});
            }
         },
         userpublicationsRecentPublication : function (doc) {
            if (doc.type === 'UserPublication' && doc.userId && doc.lastOpenedAt) {
               if (doc.publicationType !== 'StudyClass' && doc.publicationType !== 'Book') {
                  emit([doc.userId, 2, doc.lastOpenedAt], {
                     progress: doc.readingProgress,
                     _id: doc.publicationId,
                     currentStudyGuideId: doc.currentStudyGuideId,
                     readingPosition: doc.readingPosition
                  });
               }
               else if (doc.publicationType === 'Book') {
                  emit([doc.userId, 1, doc.lastOpenedAt], {
                     progress: doc.readingProgress,
                     _id: doc.publicationId,
                     currentStudyGuideId: doc.currentStudyGuideId,
                     readingPosition: doc.readingPosition
                  });
               }
               else {
                  emit([doc.userId, 0, doc.lastOpenedAt], {
                     progress : doc.readingProgress,
                     _id : doc.publicationId,
                     currentStudyItemId : doc.currentStudyItemId
                  });
               }
            }
         },
         userpublicationsAuthor : function (doc) {
            if (doc.type === 'ClassTeacher') {
               emit(doc.classId, {_id : doc.teacherId, classId : doc.classId});
            }
         },
         userpublicationsOnlyPersonal : function (doc) {
            if (doc.type === 'UserPublication' && doc.userId && doc.personal) {
               emit(doc.userId, doc.publicationId);
            }
         },

         materialsUserMaterials : function (doc) {
            if (doc.type === 'Material' && !doc.editor && doc.userIds) {
               for (var i = 0, l = doc.userIds.length; i < l; i++) {
                  emit([doc.userIds[i], doc.bookId]);
            }
            }
         },
         materialsStudyGuides : function (doc) {
            if (doc.type === 'Material' && doc.editor && doc.userIds) {
               for(var i = 0; i < doc.userIds.length; i++) {
                  emit([doc.userIds[i], doc.bookId], {
                     annotations : doc.annotations,
                     bookmarks : doc.bookmarks,
                     comments : doc.comments,
                     paraSize : doc.paraSize
                  });
               }
            }
         },
         materialsForStudyGuide : function (doc) {
            if (doc.type === 'Material' && doc.editor) {
               emit(doc.bookId, null);
            }
         },
         materialsForStudyGuideAll : function (doc) {
            if (doc.type === 'Material') {
               emit(doc.bookId, {rev : doc._rev});
            }
         },

         publicationsGetAll : function (doc) {
            if (doc.type === 'Book' || doc.type === 'Vocabulary' || doc.type === 'Dictionary' ||
               doc.type === 'StudyGuide' || doc.type === 'StudyCourse' || doc.type === 'Collection' ||
               doc.type === 'Supplemental') {
               emit(doc._id, null);
            }
         },
         publicationsGetActive : function (doc) {
            if ((doc.type === 'Book' || doc.type === 'Vocabulary' || doc.type === 'Dictionary' ||
               doc.type === 'StudyGuide' || doc.type === 'StudyCourse') && doc.status) {
               emit(doc._id, null);
            }
         },

         studyGuides : function (doc) {
            if (doc.type === 'StudyGuide') {
               emit(doc._id, {_id : doc._id, author : doc.author, name : doc.name});
            }
         },
         studyGuidePublication : function (doc) {
            if (doc.type === 'StudyGuide') {
               emit(doc._id, {_id : doc.bookId, studyGuideId : doc._id});
            }
         },

         studyGuideEditorsByStudyGuideId: function (doc) {
            if(doc.type === 'studyGuideEditor'){
               emit(doc.studyGuideId, null);
            }
         },

         userProfileByStudyGuideId: function (doc) {
            if(doc.type === 'studyGuideEditor'){
               emit(doc.studyGuideId, {_id: doc.editorId, status: doc.status});
            }
         },

         publicationsSearch : function (doc) {
            var validTypes = ['Collection', 'Dictionary', 'StudyCourse', 'StudyGuide', 'Vocabulary'];
            if (doc.language && ((doc.type === 'Book' && doc.status) || validTypes.indexOf(doc.type) > -1)) {
               if (doc.type === 'StudyGuide') {
                  emit([doc.language, doc.type, doc.category], {
                     _id : doc.bookId,
                     studyGuideId : doc._id,
                     cover : doc.cover,
                     name : doc.name,
                     author : doc.author,
                     type : doc.type,
                     description : doc.description,
                     userIds : doc.userIds,
                     exercises : doc.exercises,
                     audio: doc.audio
                  });
               }
               else {
                  emit([doc.language, doc.type, doc.category], null);
               }
            }
         },
         publicationsRelated : function (doc) {
            if (doc.status && doc.type === 'StudyGuide') {
               emit([doc.bookId, doc._id]);
            }
         },
         defaultStudyGuideByBookId : function (doc) {
            if ( doc.bookId && doc.defaultStudyGuideId ) {
               emit([doc.bookId, doc.defaultStudyGuideId]);
            }
         },
         publicationsLibraryParameters : function (doc) {
            var types = ['Book', 'StudyCourse', 'StudyGuide', 'Collection'];
            if (types.indexOf(doc.type) > -1 && doc.status) {
               if (doc.category || doc.type === 'Collection') {
                  emit([0, doc.language]);
                  emit([1, doc.type, doc.category || 'collection']);
               }
            }
         },
         publicationsCollections : function (doc) {
            if (doc.type === 'Collection') {
               doc.items.forEach(function (item, index) {
                  emit([doc._id, index], {_id : item});
               });
            }
         },

         settingsByUid : function (doc) {
            if (doc.type === 'Setting' && doc.userId) {
               emit(doc.userId, doc);
            }
         },
         settingsByFK : function (doc) {
            if (doc.type === 'Setting' && doc.userId && doc.group && doc.name) {
               emit([doc.userId, doc.group, doc.name], doc);
            }
         }
      }),

      reduce : convertToStrings({
         publicationsLibraryParameters : function () {
            return true;
         },
         userStudyCollectStats : function (key, values, rereduce) {
            var rd = 0, cb = 0, pb = 0, cq = 0, pq = 0, mf = 0, pf = 0;
            for (var i = 0; i < values.length; i++) {
               if (rereduce) {
                  rd += values[i].totalReadingTime;
                  cq += values[i].completedQuizzesCount;
                  pq += values[i].pendingQuizzesCount;
                  mf += values[i].masteredFlashcardsCount;
                  pf += values[i].pendingFlashcardsCount;
                  cb += values[i].completedBooksCount;
                  pb += values[i].booksInProgressCount;
               }
               else {
                  rd += values[i].rd;
                  cq += values[i].cq;
                  pq += values[i].pq;
                  mf += values[i].mf;
                  pf += values[i].pf;
                  if (values[i].cp) {
                     cb++;
                  }
                  else {
                     pb++;
                  }
               }
            }
            return {
               totalReadingTime : rd,
               booksInProgressCount : pb,
               completedBooksCount : cb,
               completedQuizzesCount : cq,
               pendingQuizzesCount : pq,
               masteredFlashcardsCount : mf,
               pendingFlashcardsCount : pf
            };
         },
         documentsByType : function () {
            return true;
         },
         materialsStudyGuides : function (key, values, rereduce) {
            var ns = 0;
            if (rereduce) {
               return values;
            }
            else {
               values.forEach(function (v) {
                  ns += v.annotations.length;
                  ns += v.comments.length;
                  ns += v.bookmarks.length;
               });
            }
            return [ns, values[0].paraSize];
         }
      }),


      lists : convertToStrings({
         uniqueUserActivitySummary : function () {
            var len, result = [];
            while (row = getRow()) {
               len = result.length;
               if (!len || row.value._id !== result[len - 1].value._id) {
                  result.push(row);
               }
               else {
                  result[len - 1] = row;
               }
            }
            return toJSON(result);
         },
         testViewAsMap : function () {
            var id, res = {}, testType, row;
            while (row = getRow()) {
               id = row.doc.publicationId;
               testType = row.doc.testType;
               if (id && res[id] && res[id][testType]) {
                  res[id][testType].push(row.doc);
               }
               else if (id && testType) {
                  if (res[id]) {
                     res[id][testType] = [row.doc];
                  }
                  else {
                     res[id] = {};
                     res[id][testType] = [row.doc];
                  }
               }
            }
            return JSON.stringify(res);
         },
         testSearchByCriteria : function (head, req) {
            var count = 0, total = head.total_rows, res = {}, criteria = (req.query.criteria || '').toLowerCase(), row;
            while (row = getRow()) {
               var id = row.doc.publicationId;
               if (row.doc.name && row.doc.name.toLowerCase().indexOf(criteria) > -1) {
                  count++;
                  res[id] = res[id] || {};
                  res[id].tests = res[id].tests || [];
                  res[id].tests.push({
                     id : row.doc._id,
                     description : row.doc.description,
                     name : row.doc.name,
                     testQuestionsCount : row.doc.testQuestionsCount,
                     testType : row.doc.testType
                  });
               }
            }
            return toJSON({result : res, stopFlag : count == total});
         },

         testQuestionAsMap : function () {
            var res = {}, row;
            while (row = getRow()) {
               res[row.key] = res[row.key] || [];
               res[row.key].push(row.doc);
            }
            return toJSON(res);
         },

         usersSearch : function (head, req) {
            var result = [], row, itemsCount = req.query.itemsCount, filter = req.query.filter.toLowerCase(), row;
            while (row = getRow()) {
               if (itemsCount && result.length >= itemsCount) {
                  break;
               }
               if (row.key.join(' ').toLowerCase().indexOf(filter) > -1) {
                  row.doc.id = row.id;
                  result.push(row.doc);
               }
            }
            return JSON.stringify(result);
         },

         userpublicationsTestActivation : function () {
            var arr = [], row = getRow();
            if (row) {
               for (var k in row.doc.testActivation) {
                  arr.push(row.doc.testActivation[k]);
               }
            }
            return JSON.stringify(arr);
         },
         userpublicationsListAsMap : function () {
            var id, res = {}, row;
            while (row = getRow()) {
               id = row.doc.publicationId;
               res[id] = row.doc;
               delete res[id].testActivation
            }
            return JSON.stringify(res);
         },
         publicationsLibraryParameters : function () {
            var res = {libraryLanguages : [], publicationGroups : []}, typeMap = {}, unique = [], row;
            while (row = getRow()) {
               if (row.key[0] && unique.indexOf(row.key[2]) === -1) {
                  unique.push(row.key[2]);
                  typeMap[row.key[1]] = typeMap[row.key[1]] || [];
                  typeMap[row.key[1]].push(row.key[2]);
               }
               else if (row.key[0] === 0) {
                  res.libraryLanguages.push(row.key[1]);
               }
            }
            for (var type in typeMap) {
               res.publicationGroups.push({name : type, contentType : type, categories : typeMap[type]});
            }
            return toJSON(res);
         },
         publicationsSearchForTestImport : function (head, req) {
            var res = [], criteria = req.query.criteria || '', row;
            criteria = criteria.toLowerCase();
            while (row = getRow()) {
               if (row.value.author.toLowerCase().indexOf(criteria) > -1 || row.value.name.toLowerCase().indexOf(criteria) > -1) {
                  res.push(row.value._id);
               }
            }
            return JSON.stringify(res);
         },
         publicationsSearch : function () {
            var res = [], dicts = [], publication = {}, row;
            while (row = getRow()) {
               if (row.doc && (row.doc.status || (row.doc.type === 'Vocabulary' || row.doc.type === 'Dictionary'))) {
                  if (!row.doc.status) {
                     dicts.push({id : row.doc._id, author : row.doc.author, name : row.doc.name});
                  }
                  else {
                     if (row.value && row.value.type === 'StudyGuide') {
                        publication = {
                           id : row.value.studyGuideId,
                           author : row.value.author,
                           name : row.value.name,
                           cover : row.value.cover,
                           category : 'StudyGuide',
                           type : 'StudyGuide',
                           description : row.doc.description,
                           wordsCount : row.doc.wordsCount,
                           readingTime : row.doc.readingTime,
                           difficulty : row.doc.difficulty,
                           userIds : row.value.userIds,
                           bookAuthor : row.doc.author,
                           bookTitle : row.doc.name,
                           bookCover : row.doc.cover,
                           bookId : row.doc._id,
                           exercises : row.value.exercises,
                           audio : row.value.audio,
                           collection : row.value.collection,
                           weight : row.doc.weight,
                           language: row.doc.language
                        };
                     }
                     else {
                        publication = {
                           id : row.doc._id,
                           author : row.doc.author,
                           name : row.doc.name,
                           cover : row.doc.cover,
                           category : row.doc.category,
                           type : row.doc.type,
                           description : row.doc.description,
                           wordsCount : row.doc.wordsCount,
                           readingTime : row.doc.readingTime,
                           difficulty : row.doc.difficulty,
                           userId : row.doc.userId,
                           collection : row.doc.collection,
                           paraCount : row.doc.paraCount,
                           weight : row.doc.weight,
                           language : row.doc.language,
                           audio : row.doc.audio,
                           mediaSize : row.doc.mediaSize
                        };
                        if (row.doc.items) {
                           publication.matches = row.doc.items.length;
                        }
                     }
                     res.push(publication);
                  }
               }
            }
            if (!res.length && dicts.length) res = dicts;
            return toJSON(res);
         },
         publicationsSimpleDocList : function () {
            var res = {studyGuides : []}, row;
            while (row = getRow()) {
               if (row.value) {
                  res.studyGuides.push({
                     id : row.value.studyGuideId,
                     name : row.value.name,
                     author : row.value.author,
                     category : row.value.category,
                     description : row.value.description,
                     wordsCount : row.value.wordsCount,
                     cover : row.value.cover,
                     difficulty : row.value.difficulty,
                     readingTime : row.value.readingTime,
                     type : row.value.type,
                     exercises : row.value.exercises
                  });
                  if (!res.book) {
                     res.book = {
                        id : row.doc._id,
                        name : row.doc.name,
                        author : row.doc.author,
                        category : row.doc.category,
                        description : row.doc.description,
                        wordsCount : row.doc.wordsCount,
                        cover : row.doc.cover,
                        difficulty : row.doc.difficulty,
                        readingTime : row.doc.readingTime,
                        type : row.doc.type,
                        toc : row.doc.toc
                     };
                  }
               }
            }
            return toJSON(res);
         },
         studyGuideEditorsDict : function(head, req) {
            var res = {};
            while (row = getRow()) {
               if (row.doc) {
                  res[row.doc.editorId] = row.doc;
               }
            }
            return toJSON(res);
         }
      })
   };
})();