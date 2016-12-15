define([
   'module',
   'swComponentFactory',
   'text!./Discussions.html',
   'less!./Discussions'
], function (module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         extrasApi: '=',
         gotoLocator: '&'
      },
      controller: [
         '$scope',
         'swBookInfoService',
         'swReaderService',
         'swNotificationService',
         '$timeout',
         'swContentProvider',
         function (
            $scope,
            swBookInfoService,
            swReaderService,
            swNotificationService,
            $timeout,
            swContentProvider) {
            var vm       = $scope;
            var bookKey  = swReaderService.getBookKey();

            vm.discussions      = [];
            vm.discussionsOrder = [
               'locator',
               '-createdAt'
            ];

            vm.swInit            = _init;
            vm.swDestroy         = _destroy;
            vm.goToDiscussion    = goToDiscussion;

            function _init () {
               swBookInfoService.saveBookInfo(bookKey, {extrasTab: 'Discussions'});
               swNotificationService.addNotificationListener('discussions', function () {
                  return {
                     classId : vm.extrasApi.classId
                  };
               }, _onDiscussionsChanged);
               swNotificationService.ping();
            }

            function _destroy () {
               swNotificationService.removeNotificationListener('discussions', _onDiscussionsChanged);
            }

            function goToDiscussion (_locator) {
               vm.gotoLocator({
                  locator: '#' + _locator
               });
            }

            function _onDiscussionsChanged (_data) {
               $timeout(function () {
                  vm.discussions = swContentProvider.decorateExercises(_data);
               });
            }
         }
      ]
   });
});