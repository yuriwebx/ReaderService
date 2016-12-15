define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['swAgentService',
         function (swAgentService) {
            var messages = [];

            this.persistPersonalMessage = function(userId, recipientIds, text, subject) {
               var data = {
                  userId: userId,
                  recipientIds: recipientIds,
                  text: text,
                  subject: subject
               };
               return swAgentService.request('post', 'PersonalMessage', 'persist', data);
            };

            this.updatePersonalMessageState = function(userId, messageIds, reviewed) {
               var data = {
                  userId: userId,
                  messageIds: messageIds,
                  reviewed: reviewed
               };
               setMessagesState(messageIds, reviewed);
               return swAgentService.request('post', 'PersonalMessage', 'updatestate', data);
            };

            this.searchPersonalMessage = function(userId, reviewed) {
               var data = {
                  userId: userId,
                  reviewed: reviewed
               };
               return swAgentService.request('get', 'PersonalMessage', 'search', data);
            };

            this.getPersonalMessageNotification = function() {
               return messages;
            };
            
            this.setNumberMessages = function(response) {
               messages = response;
            };

            //helper
            function setMessagesState (messageIds, isReviewed) {
               if ( !messageIds.length && !messages.length ) {
                  return;
               }
               messageIds.forEach(function (id) {
                  var i = _.findIndex(messages, {_id: id});
                  if ( i !== -1 ) {
                     messages[i].reviewed = isReviewed;
                  }
               });
            }
         }]
   });
});