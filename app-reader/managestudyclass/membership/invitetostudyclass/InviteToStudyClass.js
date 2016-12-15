define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./InviteToStudyClass.html',
   'less!./InviteToStudyClass.less'
], function(module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         config: '='
      },
      controller: [
         '$q',
         '$window',
         '$timeout',
         'swScrollFactory',
         'swStudyClassService',
         'swLazyLoadingHelper',
         'swUserService',

         function(
            $q,
            $window,
            $timeout,
            swScrollFactory,
            swStudyClassService,
            swLazyLoadingHelper,
            swUserService,

            /* jshint unused: true */
            swComponentAugmenter,
            $scope,
            $element
         ) {

            var vm = $scope;
            /* --- api --- */
            vm.fakestudents = [{firstName: '', lastName: ''}];

            vm.students = [];
            vm.filterCriteria = {text: ''};

            vm.invite = invite;
            vm.resetSearch = resetSearch;
            vm.searchStudents = searchStudents;


            /* === impl === */

            var itemsCount = 0;
            var itemsCountStep = 5;

            var scroll;

            var afterUsersFoundFn = _.once(function() {
               vm.config.afterUsersFoundFn();
               vm.fakestudents = [];
            });

            $scope.swInit = function() {
               $timeout(function(){
                  scroll = swScrollFactory.getParentScroll($element);
                  resetSearch();
               },200);
            };

            function searchStudents()
            {
               swLazyLoadingHelper.unregister(scroll);
               swLazyLoadingHelper.register(scroll, {
                  next: more,
                  rift: 500
               });
            }

            function more()
            {
               var classId = vm.config.classId;
               var text = vm.filterCriteria.text;

               itemsCount += itemsCountStep;

               return swStudyClassService.searchStudentsForClass(classId, text, itemsCount).then(_onLoad);

               function _onLoad(result) {
                  vm.students = _.map(result.data, function (item) {
                     if ( item.photo ) {
                        item.photoLink = swUserService.getUserPhoto(item.photo.fileHash);
                     }
                     return item;
                  });

                  afterUsersFoundFn();

                  if (itemsCount > vm.students.length)
                  {
                     return  $q.reject();
                  }
               }
            }

            function invite(user)
            {
               //debugger;//service client - result is not used
               swStudyClassService.inviteStudentsToClass(vm.config.classId, [user.userId], '').then(function() {
                  user.alreadyInClass = true;//$scope.searchStudents(); - commented and replaced to avoid refresh users list;
                  vm.config.afterInvitedFn();
               });
            }
            
            function resetSearch()
            {
               vm.filterCriteria.text = '';
               itemsCount = 0;
               searchStudents();
            }
         }
      ]
   });
});
