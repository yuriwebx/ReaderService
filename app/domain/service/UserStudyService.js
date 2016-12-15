
define([
   'underscore',
   'module',
   'swServiceFactory'
], function (_, module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['swRestService', 'swAgentService',
         function (swRestService, swAgentService) {
            var currentStudyInfo = {
               studyId        : 0,
               publicationId  : 0,
               studyItemId    : 0
            };
            var currentStudyItems = {};

            this.initiatePublicationStudy = function (mode, publicationId, classId)
            {
               var params = {
                  mode           : mode,
                  publicationId  : publicationId,
                  classId        : classId
               };

               return swAgentService.request('post', 'UserStudy', 'initiate', params)
               .then(function(response) {
                  currentStudyInfo.studyId       = response.data._id;
                  currentStudyInfo.publicationId = response.data.publicationId;
                  currentStudyInfo.studyItemId   = response.data.currentStudyItemId;
                  currentStudyItems = indexByLocator(response.data.studyItems);

                  return response;
               });
            };

            this.persistUserStudyProgress = function (params, silentMode){
               var restServiceMethod = silentMode ? 'call' : 'restSwHttpRequest';
               currentStudyInfo.studyItemId = params.currentStudyItemId;
               var data = {
                  publicationId      : params.publicationId,
                  recordedAt         : params.recordedAt,
                  readingProgress    : params.readingProgress,
                  currentStudyItemId : params.currentStudyItemId,
                  readingPosition    : params.readingPosition,
                  readingDuration    : params.readingDuration,
                  readingWordNumber  : params.readingWordNumber,
                  completed          : params.completed,
                  classId            : params.classId,
                  type               : params.type
               };
               return swAgentService.request('post', 'UserStudy', 'persistprogress', data, null, restServiceMethod);
            };

            this.persistFlashCard = function(params)
            {
              params.type = 'flashCard';
               _.extend(params, currentStudyInfo);
               return swAgentService.request('post', 'UserStudy', 'persistTest', params);
            };

            this.persistTest = function(params)
            {
               params.type = 'quiz';
               _.extend(params, currentStudyInfo);
               return swAgentService.request('post', 'UserStudy', 'persistTest', params);
            };

            this.persistEssay = function(params)
            {
               _.extend(params, currentStudyInfo);
               return swAgentService.request('post', 'UserStudy', 'persistEssay', params);
            };

            this.persistParagraphSummary = function(params)
            {
               _.extend(params, currentStudyInfo);
               return swAgentService.request('post', 'UserStudy', 'persistParagraphSummary', params);
            };

            this.searchUserStudy = function(classId, filter, category, interval, itemsCount)
            {
               var data = {
                  classId     : classId,
                  filter      : filter,
                  category    : category,
                  interval    : interval,
                  itemsCount  : itemsCount
               };
               return swAgentService.request('post', 'UserStudy', 'searchuserstudy', data);
            };

            this.getUserStudyMaterials = function()
            {
               return currentStudyItems[currentStudyInfo.studyItemId] || {};
            };

            function indexByLocator(studyItems) {
               return _.reduce(studyItems, function(indexedData, item) {
                  indexedData[item.id] = {};
                  if (item.paragraphSummaries) { //paragraphSummaries have already grouped by locator
                     indexedData[item.id] = _.mapValues(item.paragraphSummaries, function(summary) {
                        return { microJournalling : [summary] };
                     });
                  }
                  if (item.essays) {
                     addToObj(indexedData[item.id], _.values(item.essays), 'paragraphId', 'essayTask');
                  }
                  addToObj(indexedData[item.id], [].concat.call(_.values(item.quizzes) || [], _.values(item.flashcards) || []), 'locator', 'test');

                  return indexedData;
               }, {});
            }

            function addToObj(obj, collection, groupByParam, prop) {
               _.extend(obj, _.groupBy(collection, groupByParam), function(value, other) {
                  var newObj = {};
                  newObj[prop] = other;
                  return _.isUndefined(value) ? newObj : _.extend(value, newObj);
               });
            }
            //FOR testing
            this.setUserStudyProgressClass = function(classId, progress){
               var data = {
                  classId  : classId,
                  progress : progress
               };
               return swRestService.restSwHttpRequest('post', 'UserStudy', 'setprogress', data);
            };

            this.persistReadingProgressTracking = persistReadingProgressTracking;

            function persistReadingProgressTracking(progressType, progressData) {
               ['from', 'to', 'paragraphLocator'].forEach(function(property){
                  if(progressData.hasOwnProperty(property)){
                     progressData[property] = progressData[property].toJSON();
                  }
               });
               var data = {
                 studyId: currentStudyInfo.studyId,
                 study: currentStudyInfo,
                 progressType: progressType,
                 progressData: progressData
               };
               var params = {
                  swBlockUserInput: false
               };
               return swAgentService.request('post', 'UserStudy', 'readingprogresstracking', data, params);
            }
         }]
   });
});