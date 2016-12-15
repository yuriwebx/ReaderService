define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./SearchTeachersForStudyClass.html',
   'less!./SearchTeachersForStudyClass.less'
], function (module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope : {
         popupConfig : '='
      },
      submachine : true,
      controller : [
         '$scope',
         'swStudyClassService',
         'swUserService',
         function (
            $scope,
            swStudyClassService,
            swUserService) {
            var vm = $scope;
            var ITEMS_COUNT = 10;

            vm.swInit        = _init();
            vm.performSearch = searchTeachers;
            vm.applyTeacher  = applyTeacher;

            vm.teachers = [];
            vm.filterText = '';

            function _init () {
               searchTeachers();
            }

            function searchTeachers () {
               swStudyClassService.searchTeachersForClass(vm.popupConfig.classId, vm.filterText, ITEMS_COUNT).then(prepareTeachers);
               function prepareTeachers (response) {
                  vm.teachers = _.map(response.data, function (_t) {
                     if ( _.findWhere(vm.popupConfig.teachers, {userId: _t.userId}) ) {
                        _t.alreadyInvited = true;
                     }
                     if (_t.photo && _t.photo.fileHash) {
                        _t.isPhoto = true;
                        _t.photoLink = swUserService.getUserPhoto(_t.photo.fileHash);
                     }
                     return _t;
                  });
               }
            }

            function applyTeacher (teacher) {
               teacher.role = 'TeacherAndStudent';
               vm.popupConfig.teachers.push(teacher);
               setInvitationStatus(teacher.userId, true);
            }

            function setInvitationStatus (_userId, _status) {
               _.each(vm.teachers, function (_t) {
                  if ( _t.userId === _userId ) {
                     _t.alreadyInvited = _status;
                  }
               });
            }
         }]
   });
});