define([
   'module',
   'swComponentFactory',
   'text!./BeginNewStudy.html',
   'less!./BeginNewStudy.less'
], function (module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template: template,
      isolatedScope: {
         publicationData: '=',
         api: '='
      },
      controller : [
         '$scope',
         'swCreateStudyProjectService',
         'swStudyClassService',
         'swLongRunningOperation',
         function ($scope, swCreateStudyProjectService, swStudyClassService, swLongRunningOperation) {
            $scope.api.selectOption = true;
            $scope.classes = [];
            $scope.labelKey = 'BeginNewStudy.header.label';
            $scope.filter = {text: ''};
            $scope.itemsCount = 20;
            $scope.noClassesFoundMessage = 'Sorry, there are no open classes for this publication';
            
            $scope.swInit = function()
            {
               
            };
            
            $scope.resetSearch = function()
            {
               $scope.filter.text = '';
               $scope.searchClasses();
            };
            
            $scope.goToSelectClass = function()
            {
               $scope.searchClasses();
            };
            
            $scope.createStudyClass = function()
            {
               // swStudyClassService.beginNewStudy({classId : $scope.publicationData.courseId});
               swCreateStudyProjectService.showCreateStudyProjectPopup();
            };
            
            $scope.joinClass = function(classId)
            {
               swStudyClassService.resumeCourse({classId : classId});
            };
            
            $scope.back = function()
            {
               if ($scope.api.selectOption)
               {
                  $scope.api.close();
               }
               $scope.api.selectOption = !$scope.api.selectOption;
            };
            
            $scope.searchClasses = function()
            {
               swLongRunningOperation.suspend();
               swStudyClassService.searchStudyClassesByPublication($scope.publicationData.courseId, $scope.filter.text, $scope.itemsCount).then(function(result){
                  $scope.api.selectOption = false;
                  $scope.classes = result.data;
               });
               swLongRunningOperation.resume();
            };
         }]
   });
});