define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./Membership.html',
   'less!./LibraryBookList.less'
], function (module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope : {
         studyClassInfo: '=',
         studentsApi: '=',
         classId: '='
      },
      controller : [
         '$scope',
         'swManagePersonalMessagesService',
         'swInviteToStudyClassService',
         'swPersonalMessageService',
         'swStudyClassService',
         'swUserService',
         function (
            $scope,
            swManagePersonalMessagesService,
            swInviteToStudyClassService,
            swPersonalMessageService,
            swStudyClassService,
            swUserService) {
            var userId = swUserService.getUserId(),
                isTeacher = _isTeacher($scope.studyClassInfo.teachers);

            $scope.isUserRequestsVisible = true;
            $scope.userRequests = [];//???

            $scope.swInit = function () {
               $scope.studentsApi.refreshStudentsList();

               //TODO: check if this function needed
               swPersonalMessageService.searchPersonalMessage().then(prepareMessages);
               function prepareMessages (messages) {
                  _.each(messages.data, function (message) {
                     if ( message.classId ) {
                        prepareRequest(message);
                     }
                  });
               }
               function prepareRequest (message) {
                  swStudyClassService.getStudyClassInfo(message.classId)
                      .then(function (result) {
                         if ( _isTeacher(result.data.teachers) ) {
                            addToRequests(message);
                         }
                      });
               }
            };

            $scope.toggleBlockVisibility = function () {
               $scope.isUserRequestsVisible = !$scope.isUserRequestsVisible;
            };

            $scope.acceptRequest = function (request) {
               swInviteToStudyClassService.acceptRequest({
                  classId : $scope.classId,
                  userId : request.userId
               }).then(function () {
                  $scope.studentsApi.refreshStudentsList();
               });
            };

            $scope.declineRequest = function (request) {
               swInviteToStudyClassService.declineRequest({
                  classId : $scope.classId,
                  userId : request.userId
               }).then(function () {
                  $scope.studentsApi.refreshStudentsList();
               });
            };

            $scope.removeUser = function (student) {
               swStudyClassService.persistClassStudentStatus(userId, $scope.classId, [student.userId], 'Blocked', '')
                   .then(function () {
                      $scope.studentsApi.refreshStudentsList();
                   });
            };
            
            $scope.sendMessage = function (student) {
               swManagePersonalMessagesService.sendMessage([student], $scope.classId);
            };

            $scope.isCurrentUser = function (classMember) {
               return classMember.userId === userId;
            };

            $scope.isRemoveAllowed = function (classMember) {
               return isTeacher && ( classMember.role !== "Teacher" && classMember.role !== "TeacherAndStudent" );
            };

            function addToRequests(request) {
               swUserService.getUserProfileState(request.fromUserId).then(prepareUserRequest);

               function prepareUserRequest (profileInfo) {
                  request.fromUserName = profileInfo.userProfileInfo.firstName + ' ' + profileInfo.userProfileInfo.lastName;
                  $scope.userRequests.push(request);
               }
            }

            function _isTeacher (_usersArr) {
               return !!_.find(_usersArr, function (_t) {
                  return _t.userId === userId;
               });
            }
         }]
   });
});