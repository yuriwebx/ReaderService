define([
   'module',
   'swComponentFactory',
   'text!./ManageEditField.html',
   'less!./ManageEditField.less'
], function (module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         configfunction: '=',
         options: '='
      },
      controller: ['$scope',
         function ($scope) {

            $scope.swInit = function () {
               if ( $scope.configfunction === undefined ) {
                  throw new Error('Component manage-edit-field should be specified configfunction = { edit: function, save : function, cancel: function}');
               }
               if ( $scope.options === undefined ) {
                  $scope.options = {editOptions: {}};
               }
            };

            var isEdit = true;

            $scope.edit = function () {
               $scope.configfunction.edit($scope.options.editOptions);
               isEdit = false;
            };

            $scope.save = function () {
               $scope.configfunction.save();
               isEdit = true;
            };

            $scope.cancel = function () {
               $scope.configfunction.cancel();
               isEdit = true;
            };

            $scope.showEditButtons = function(){
               if($scope.configfunction.showEditButtons){
                  isEdit = $scope.configfunction.showEditButtons($scope.options.editOptions);
               }
               return isEdit;
            };
       }]

   });
});