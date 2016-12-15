define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./StudyProgress.html',
   'less!./StudyProgress.less'
], function(module, _, swComponentFactory, template) {
   'use strict';
   
   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope:{
         progress     : '=',
         numbercircls : '='
      },
      controller : ['$scope', function($scope) {
         var vm = $scope;

         /* --- api --- */
         vm.numberOfElements  = [];
         vm.isFullProgress    = isFullProgress;

         /* === impl === */
         $scope.swInit = swInit;

         function swInit() {
            var progress      = vm.progress,
                numbercircls  = vm.numbercircls;
            var numberOfActiveElements = parseInt(progress / (100 / (numbercircls + 1)), 10);
            // TODO use _.fill after update
            vm.numberOfElements = _.map(new Array(vm.numbercircls), function(/* jshint unused: true */ val, index) {
               return index < numberOfActiveElements ? 'active' : '';
            });
         }

         function isFullProgress() {
            return vm.progress > 90;
         }
      }]
   });
});