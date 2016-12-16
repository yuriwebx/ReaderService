define([
   'Context',
   'module',
   'underscore',
   'swComponentFactory',
   'text!./PersonalMessagesToolbarButton.html'
], function(Context, module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {},
      controller: [
         '$scope',
         'swPersonalMessagesMenuService',
         'swPersonalMessageService',
         'swApplicationToolbarService',
         'swLayoutManager',
         function($scope,
                  swPersonalMessagesMenuService,
                  swPersonalMessageService,
                  swApplicationToolbarService,
                  swLayoutManager) {
            var vm = $scope;
            var isEditor = swApplicationToolbarService.isEditor();
            var messageTypes = Context.parameters.messageTypes;
            var _numberMessages = 0;
            var popup;
            var id = $scope.$id;

            vm.swInit = swInit;
            vm.swDestroy = swDestroy;
            vm.toggleMessageMenu = toggleMessageMenu;
            vm.userHasMessage = userHasMessage;
            vm.userHasUnreadMessages = userHasUnreadMessages;
            vm.getNumberMessages = getNumberMessages;

            swLayoutManager.register({
               id: id,
               layout: _onLayout
            });

            function swInit() {
               var numberMessages = swPersonalMessageService.getPersonalMessageNotification();
               _numberMessages = numberMessages.length;
            }

            function swDestroy() {
               swLayoutManager.unregister(id);
               // swStudyFlashcardsService.remGetSearchFlashcardStudies(getNotificationStatus);
            }

            function toggleMessageMenu($event) {
              popup = swPersonalMessagesMenuService.toggleMessageMenu($event.currentTarget);
            }

            function userHasMessage() {
               var messages = swPersonalMessageService.getPersonalMessageNotification();
               var numberMessages  = messages ? messages.length : 0;
               return numberMessages !== 0;
            }

            function userHasUnreadMessages() {
               var messages = swPersonalMessageService.getPersonalMessageNotification();
               var unreadMessage = _.filter(messages, function(message){
                  return !message.reviewed && isMessageAllowed(message);
               });
               _numberMessages  = unreadMessage ? unreadMessage.length : 0;
               return unreadMessage.length !== 0;
            }

            function getNumberMessages () {
               return _numberMessages;
            }

            function isMessageAllowed (message) {
               return isEditor && message.type === messageTypes.studyGuide ||
                      !isEditor && message.type === messageTypes.studyClass ||
                      message.type === messageTypes.personal;
            }

            function _onLayout(context) {
               var e = context.events;
               if ((e.orienting || e.resizing) && popup) {
                  popup.hide();
               }
            }
         }
      ]
   });
});
