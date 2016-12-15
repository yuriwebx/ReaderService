define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./EditableDescription.html',
   'less!./EditableDescription.less'
], function(module, _, swComponentFactory, template) {
   'use strict';
   
   swComponentFactory.create({
       module : module,
       template : template,
       isolatedScope:{
          isEditMode    : '=',
          item          : '=',
          editData      : '='
       },
       controller : ['$scope', '$element',
          function($scope, $element) {

          $scope.swInit = function(){};

          var openedDescription = false;
          $scope.showArrow = false;
          
          $scope.isEmpty = function (text) {
             return text === undefined || text.length === 0;
          };

          $scope.showDescription = function() {
             if ($scope.showArrow) {
                openedDescription = !openedDescription;
             }
          };

          $scope.isOpenedDescription = function(){
             return openedDescription;
          };

          $scope.showEditFields = function() {
             return $scope.isEditMode;
          };

          $scope.onResizeElement = function() {
             if (!$scope.item.description) {
                return;
             }
             var desc = $element.find('.text-desc');
             if (desc.text().length === 0) {
                openedDescription = false;
             }
             $scope.$apply(function() {
                var ellipsis = desc.is('.sw-ellipsis.is-truncated');
                var height = desc.height();
                var lineHeightJQeury =  parseInt(desc.css('line-height'), 10);
                $scope.showArrow = (Math.round(height / lineHeightJQeury) > 3 || ellipsis) && !$scope.isEditMode;
             });
          };

          $scope.$watch('editData.description', function() {
             _.defer(function() {
                $element.toggleClass('force-redraw');
             });
          });
       }]
   });
});