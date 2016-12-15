define([
   'module',
   'swComponentFactory',
   'text!./ManageDiscussion.html',
   'less!./ManageDiscussion'
], function (module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         headerFn: '=',
         discussionData : '='
      },
      controller: [
         '$scope',
         'swUtil',
         'swManageDiscussionTasksService',
         'swManageClassDiscussionsService',
         'swValidationService',
         'swUserService',
         function (
            $scope,
            swUtil,
            swManageDiscussionTasksService,
            swManageClassDiscussionsService,
            swValidationService,
            swUserService) {
            var user = swUserService.getUser();

            $scope.swInit = function () {
               if (!$scope.discussionData._id) {
                  $scope.discussionData._id = swUtil.uuid();
                  $scope.discussionData.type = 'ClassDiscussion';
                  $scope.discussionData.author = user.firstName + ' ' + user.lastName;
               }
            };

            $scope.headerFn.persistFn = function () {
               swValidationService.setValidationMessagesEnabled($scope.form, true);

               if ($scope.form.$valid) {
                  swValidationService.setValidationMessagesEnabled($scope.form, false);

                  if ($scope.discussionData.classId) {
                     persistClassDiscussion();
                  }
                  else {
                     persistDiscussionTask();
                  }
               }

            };

            $scope.validate = function (value) {
               return {
                  required: {
                     value: value,
                     active: true
                  }
               };
            };

            function persistDiscussionTask () {
               swManageDiscussionTasksService.persistDiscussionTask($scope.discussionData)
                  .then(function () {
                     $scope.headerFn.closePopup($scope.discussionData);
                  });
            }

            function persistClassDiscussion () {
               swManageClassDiscussionsService.persistClassDiscussion($scope.discussionData)
                  .then(function () {
                     $scope.headerFn.closePopup($scope.discussionData);
                  });
            }

         }]
   });
});