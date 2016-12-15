define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: ['swRestService', 'swAgentService', 'swContentProvider',
         function (swRestService, swAgentService, swContentProvider)
         {
            var listeners = [];

            this.persistClassDiscussion = function (classDiscussion) {
               var date = Date.now();
               classDiscussion.createdAt = classDiscussion.createdAt || date;
               classDiscussion.modifiedAt = date;

               if ( classDiscussion.bookId ) {
                  var eventName = classDiscussion.createdAt !== classDiscussion.modifiedAt ? 'update' : 'add';
                  swContentProvider.onMaterialsChange('classDiscussions', classDiscussion, eventName);
               }
               return swAgentService.request('post', 'Discussion', 'persistClassDiscussion', classDiscussion);
            };

            this.getClassDiscussion = function (classDiscussionId, classId) {
               var reqData = {
                  classDiscussionId : classDiscussionId,
                  classId : classId
               };
               return swAgentService.request('get', 'Discussion', 'getClassDiscussion', reqData);
            };

            this.removeClassDiscussion = function (classDiscussionId) {
               var reqData = {
                  classDiscussionId : classDiscussionId
               };
               return swAgentService.request('delete', 'Discussion', 'removeClassDiscussion', reqData);
            };

            this.searchClassDiscussions = function (classId, bookId) {
               var reqData = {
                  classId : classId,
                  bookId  : bookId
               };
               return swAgentService.request('get', 'Discussion', 'searchClassDiscussions', reqData);
            };

            this.persistDiscussionMessage = function (message) {
               return swAgentService.request('post', 'Discussion', 'persistDiscussionMessage', message);
            };

            //TODO offline - disabled in app server
            this.setClassDiscussionState = function (classDiscussionId, isFrozen) {
               var reqData = {
                  classDiscussionId : classDiscussionId,
                  frozen            : isFrozen
               };
               return swRestService.restSwHttpRequest('post', 'Discussion', 'setClassDiscussionState', reqData);
            };

            this.updateUserDiscussionMessagesState = function (classDiscussions, reviewed, informed) {
               var reqData = {
                  classDiscussions : classDiscussions,
                  reviewed : reviewed,
                  informed : informed
               };
               return swAgentService.request('post', 'Discussion', 'updateUserDiscussionMessagesState', reqData);
            };

            this.searchUserClassDiscussions = function (_itemsCount) {
               var reqData = {
                  itemsCount : _itemsCount
               };
               return swRestService.restSwHttpRequest('post', 'Discussion', 'searchUserClassDiscussions', reqData);
            };

            this.setUnreadDiscussions = function (locators) {
               _.each(listeners, _.method('call', null, locators));
            };

            this.addUnreadUserClassDiscussionsListener = function (listener) {
               listeners = _.union(listeners, [listener]);
            };

            this.removeUnreadUserClassDiscussionsListener = function (listener) {
               _.pull(listeners, listener);
            };
         }
      ]
   });
});