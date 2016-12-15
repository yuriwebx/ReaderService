define([
   'module',
   'Context',
   'swComponentFactory',
   'text!./Info.html',
   'less!./Info.less'
], function (module, Context, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         studyProject: '=',
         wizardApi: '='
      },
      controller: [
         '$scope',
         'swI18nService',
         'swUserService',
         function (
            $scope,
            swI18nService,
            swUserService
         ) {

            $scope.studyProject.types = Context.parameters.studyProjectConfig.studyClassTypeEnum.map(function(o) {
               return {
                  type : swI18nService.getResource(o.type),
                  label: swI18nService.getResource(o.label),
                  desc : swI18nService.getResource(o.desc)
               };
            });

            $scope.studyProject.type  = $scope.studyProject.type || $scope.wizardApi.getObjectsItemValue($scope.studyProject.types[0], 0);

            $scope.swInit = function () {
               $scope.wizardApi.debValid();
               $scope.wizardApi.getProgress();

               var user = swUserService.getUser();
               $scope.courseUserName = user.firstName + ' ' + user.lastName;


               if ($scope.studyProject.publication) {
                  if (!$scope.studyProject.name) {
                     $scope.studyProject.name = $scope.courseUserName + "'s " + swI18nService.getResource('CreateStudyProject.wizard.step1.default.name', $scope.studyProject.publication);
                  }
                  if (!$scope.studyProject.description) {
                     $scope.studyProject.description =  swI18nService.getResource('CreateStudyProject.wizard.step1.default.description', $scope.studyProject.publication);
                  }
               }
               else {
                  $scope.studyProject.name = $scope.courseUserName + "'s Study";
               }
            };

            $scope.setType = function (type) {
               $scope.studyProject.type = type;
            };

            $scope.isActive = function (type) {
               return type === $scope.studyProject.type;
            };
         }]
   });
});