define([
   'module',
   'swComponentFactory',
   'text!./ManageEssayTask.html',
   'less!./ManageEssayTask'
], function (module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope:
      {
        headerfn   : '='
      },
      controller: [
         '$scope',
         'swManageEssayTaskService',
         'swManageEssayTasksService',
         'swUtil',
         'swValidationService',
         'swContentProvider',
         function ($scope, swManageEssayTaskService, swManageEssayTasksService, swUtil, swValidationService, swContentProvider)
         {
            $scope.essayData = swManageEssayTaskService.getEssayTaskData();
            var eventName = 'update';
            $scope.swInit = function ()
            {
              if (!$scope.essayData){
                eventName = 'add';
                $scope.essayData = {};
                $scope.essayData.publicationId = swManageEssayTaskService.getPublicationId();
                $scope.essayData.locator = {
                  type: "B",
                  paragraphId: swManageEssayTaskService.getParagraphId(),
                  index: 1
                };
              }

            };

            $scope.headerfn.closePopup = function ()
            {
               swManageEssayTaskService.close();
            };

            $scope.headerfn.persistEssayTask = function ()
            {
              if (!$scope.essayData._id)
              {
                 $scope.essayData._id = swUtil.uuid();
              }
              swValidationService.setValidationMessagesEnabled($scope.form, true);
              if ($scope.form.$valid)
              {
                swManageEssayTasksService.persistEssayTask($scope.essayData)
                  .then(function () {
                     var currentTime = new Date().getTime();

                     if ($scope.form) {
                        swValidationService.setValidationMessagesEnabled($scope.form, false);
                     }

                     if (!$scope.essayData.hasOwnProperty('createdAt')){
                        $scope.essayData.createdAt = currentTime;
                     }

                     $scope.essayData.type = 'EssayTask';
                     $scope.essayData.modifiedAt = currentTime;

                     editingCompletion($scope.essayData);
                     swManageEssayTaskService.close($scope.essayData);
                  }, function () {
                     $scope.logger.error('Error saving essay task');
                });
              }
            };

            $scope.validateField = function (value)
            {
               return {
                  required: {
                     value: value,
                     valid: value
                  }
               };
            };

            $scope.validateFieldNumber = function (value)
            {
              var limit = value === '' ? 0 : parseInt(value, 10);
              limit = isNaN(limit) ? false : limit.toString().length <= 6; 
              return {
                 required: {
                    value: value,
                    valid: limit
                 },
                 numeric: {
                    value: value,
                    valid: limit
                 }
              };
            };

            function editingCompletion(essayTaskData)
            {
               $scope.disabled = false;
               swContentProvider.onMaterialsChange(essayTaskData.type, essayTaskData, eventName);
               swManageEssayTaskService.close(essayTaskData);
            }

         }]
   });
});