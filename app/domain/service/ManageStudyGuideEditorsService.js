
define([
   'module',
   'swServiceFactory',
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['swRestService',
         function (swRestService) {

            this.persistStudyGuideEditorsStatus = function (studyGuideId, editorIds, status, comment) {
               var _reqData = {
                  studyGuideId : studyGuideId,
                  editorIds    : editorIds,
                  status       : status,
                  comment      : comment
               };
               return swRestService.restSwHttpRequest('post', 'StudyGuide', 'persistEditorsStatus', _reqData);
            };

            this.searchEditorsForStudyGuide = function (studyGuideId, filter, itemsCount) {
               var _reqData = {
                  studyGuideId : studyGuideId,
                  filter       : filter,
                  itemsCount   : itemsCount
               };
               return swRestService.restSwHttpRequest('get', 'StudyGuide', 'searchEditors', _reqData);
            };
         }]
   });
});