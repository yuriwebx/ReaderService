define([
   'module',
   'swComponentFactory',
   'text!./Context.html',
   'less!./Context.less'
], function(module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         extend: '='
      },
      controller: [
         '$scope',
         '$window',
         'swContextPopupService',
         'swStudyClassService',
         'swContentProvider',
         'swUnifiedSettingsService',
         'swOfflineModeService',
         function ($scope, $window, swContextPopupService, swStudyClassService, swContentProvider, swUnifiedSettingsService, swOfflineModeService) {

            var isVisibleCopyInSafari = $window.safari || ($window.navigator.platform === 'iPad' && !$window.cordova),
                isCreateDiscussionVisible = !swStudyClassService.getStudyClassSettings().isIndependentStudy && $scope.extend.allowDiscussions || $scope.extend.isEditor;

            $scope.buttons = [
               {name: 'Note',          type: 'note',      excludeAside: true, isInvisible: $scope.extend.isAdvancedSearch},
               {name: 'Lookup',        type: 'lookup',    excludeAside: true, isInvisible : swOfflineModeService.isOffline()},
               {name: 'Copy',          type: 'copy',      excludeAside: true, isVisibleCopyInSafari: isVisibleCopyInSafari},
               {name: 'Social Share',  type: 'share',     excludeAside: true, isInvisible : swOfflineModeService.isOffline()},
               {name: ($scope.extend.bookmarkExist ? 'Remove ' : '') + 'Bookmark',      type: 'mark',      editor: true, isInvisible: $scope.extend.isAdvancedSearch},
               {name: 'Add Paragraph Note',   type: 'comment',   editor: true, isInvisible: $scope.extend.isAdvancedSearch},
               {name: 'Add Essay',      type: 'essay',      editor: true, isInvisible: $scope.extend.isAdvancedSearch},
               {name: 'Create Quiz',      type: 'quiz',      editor: true, isInvisible: $scope.extend.isAdvancedSearch},
               {name: 'Create Deck', type: 'flashcard', editor: true, isInvisible: $scope.extend.isAdvancedSearch},
               {name: 'Create Discussion', type: 'discussion', excludeAside: true, isInvisible: !isCreateDiscussionVisible || $scope.extend.isAdvancedSearch},
               {name: 'Reset Reading', type: 'reset-reading', excludeAside: true, isInvisible: $scope.extend.isAdvancedSearch || $scope.extend.isEditor},
               {name: 'Report about mistake', type: 'report', excludeAside: true},
               {
                  name: 'Play',
                  type: 'audio',
                  isInvisible: $scope.extend.isEditor || !swContentProvider.hasAudio() && swUnifiedSettingsService.getSetting('ScrollSettings', 'reproductionType') === 'Audio'
               }

            ];

            $scope.selectItem = function (item) {
               swContextPopupService.showPopup(null, item.type, [{isEditor: item.editor}]);
            };

         }]
   });
});
