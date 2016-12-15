define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./AssessmentToolbarButton.html'
], function(module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {},
      controller: [
         '$scope',
         'swAssessmentMenuService',
         'swStudyFlashcardsService',
         'swLayoutManager',
         'swManageClassDiscussionsService',
         'swPublicationAudioManager',
         function (
            $scope,
            swAssessmentMenuService,
            swStudyFlashcardsService,
            swLayoutManager,
            swManageClassDiscussionsService,
            swPublicationAudioManager
         ) {
            var vm = $scope;
            var id = vm.$id;
            var popup;
            var notifiedItems = {
               discussions : 0,
               flashcards  : 0
            };

            swLayoutManager.register({
               id: id,
               layout: _onLayout
            });

            vm.notificationsCount = 0;
            vm.assessmentMenuData = {
               discussions: []
            };

            vm.swInit = _init;
            vm.swDestroy = _destroy;
            vm.toggleAssessmentsMenu = toggleAssessmentsMenu;

            function _init () {
               swStudyFlashcardsService.searchFlashcardStudies(vm.isNotificationsActive);
               swStudyFlashcardsService.getSearchFlashcardStudies(getNotificationStatus);
               swManageClassDiscussionsService.addUnreadUserClassDiscussionsListener(onUnreadDiscussionsChanged);
            }

            function _destroy () {
               swLayoutManager.unregister(id);
               swStudyFlashcardsService.remGetSearchFlashcardStudies(getNotificationStatus);
            }

            function toggleAssessmentsMenu ($event) {
               swPublicationAudioManager.pause();
               notifiedItems.discussions = 0;
               popup = swAssessmentMenuService.toggleAssessmentMenu($event.currentTarget, vm.assessmentMenuData);
            }

            function getNotificationStatus (flashCardStudyIds) {
               notifiedItems.flashcards = flashCardStudyIds.length;
               updateNotificationsCount();
            }

            function _onLayout (context) {
               var e = context.events;
               if ((e.orienting || e.resizing) && popup) {
                  popup.hide();
               }
            }

            function onUnreadDiscussionsChanged (_discussions) {
               var i = 0;
               _.each(_discussions, function (_d) {
                  var notInformed = _.filter(_d.messages, function (_m) {
                     return !_m.informed;
                  });
                  i = notInformed.length ? i + 1 : i;
               });
               notifiedItems.discussions = i;
               vm.assessmentMenuData.discussions = _discussions;
               updateNotificationsCount();
            }

            function updateNotificationsCount () {
               var updatedCount = 0;
               _.each(notifiedItems, function (_val) {
                  if ( _.isNumber(_val) && _val >= 0 ) {
                     updatedCount += _val;
                  }
               });
               vm.notificationsCount = updatedCount;
            }
         }
      ]
   });
});
