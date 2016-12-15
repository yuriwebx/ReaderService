define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
         'swApplicationToolbarService',
         'swAgentService',
         'swRestService',
         function (swApplicationToolbarService, swAgentService, swRestService) {
            var lastItem = {};
            var recentItems = {};

            this.updateUserPublication = function(userPublication)
            {
               var _isEditor = swApplicationToolbarService.isEditor();
               // FIX: promise don't trigger an error if it's rejected
               return swAgentService.request('post', 'UserPublication', 'update', {
                  userPublication   : userPublication,
                  isEditor          : _isEditor
               }).then(function(response){
                  lastItem = response.data || {};
                  return response.data;
               });
            };

             this.getRecentBooks = function()
             {
                 var _isEditor = swApplicationToolbarService.isEditor();
                 return swAgentService.request('get', 'UserPublication', 'getRecentBooks', {isEditor : _isEditor})
                     .then(function (response) {

                     if (!_isEditor) {
                         // TODO: possible redundant filters by type
                         response.data.books = _.filter(response.data.books, function (item) {
                             return item.type !== 'StudyCourse';
                         });
                         if (_.has(response.data, 'lastItem')) {
                             lastItem = response.data.lastItem.type !== 'StudyCourse' ? response.data.lastItem : (_.first(response.data.books) || {});
                         }
                         recentItems = response.data;
                     }
                     else {
                         lastItem = response.data.lastItem || {};
                         recentItems = response.data;
                     }
                     return response.data;
                 });
             };

            // FIX: it can modify 'lastItem'. This is an unexpected behaviour
            this.getLastRecentItem = function (isPublicationOnly) {
               var _isEditor = swApplicationToolbarService.isEditor();
               if(lastItem && lastItem.type === 'StudyClass' && ( _isEditor || isPublicationOnly )) {
                  lastItem = recentItems.books &&  recentItems.books[0] ? recentItems.books[0] : {};
               }
               return lastItem || {};
            };

            this.updateTitleLastRecentItem = function(name, author){
               lastItem.name = name;
               lastItem.author = lastItem.author ? author : author;
            };

            this.saveEditorReadingPosition = _.debounce(function (readingPosition, publicationId) {
               var _isEditor = swApplicationToolbarService.isEditor();
               swRestService.restSwHttpRequest('post', 'UserPublication', 'update', {
                  userPublication : {
                     readingPosition   : readingPosition,
                     publicationId     : publicationId
                  },
                  isEditor : _isEditor
               }, {
                  swBlockUserInput : false
               });
            }, 700);
         }]
   });
});