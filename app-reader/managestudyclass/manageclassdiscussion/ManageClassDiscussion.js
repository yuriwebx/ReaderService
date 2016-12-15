define([
   'module',
   'moment',
   'underscore',
   'swComponentFactory',
   'text!./ManageClassDiscussion.html',
   'less!./ManageClassDiscussion.less'
], function (module, moment, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         discussions: '=',
         studyClass: '=',
         isTeacher: '=',
         courseApi: '='
      },
      controller: [
         '$scope',
         'swNotificationService',
         'swManageClassDiscussionsService',
         'swOpenPublicationService',
         'swDiscussionsService',
         'swLongRunningOperation',
         function (
            $scope,
            swNotificationService,
            swManageClassDiscussionsService,
            swOpenPublicationService,
            swDiscussionsService,
            swLongRunningOperation) {
            var vm                   = $scope;
            var TIME_FORMAT          = ('MMM D, YYYY h:mm A');
            var classId              = vm.studyClass.class.classId;
            var searchDiscussionsEnd = _.noop;

            vm.visibleDiscussion = {};
            vm.newMessage        = {text: ''};
            vm.isEditMode        = false;
            vm.isDiscussionsList = true;

            vm.swInit                = _init;
            vm.swDestroy             = _destroy;
            vm.filterClassOnly       = filterClassOnly;
            vm.filterCurrent         = filterCurrent;
            vm.filterFuture          = filterFuture;
            vm.removeClassDiscussion = removeClassDiscussion;
            vm.goToDiscussion        = goToDiscussion;
            vm.createClassDiscussion = createClassDiscussion;

            function _onUpdate (response) {
               vm.discussions = _.has(response, 'data') ? response.data : response;
               vm.discussions = _.sortByAll(vm.discussions, ['locator', 'createdAt', 'bookId']);
               vm.isDiscussionsList = !!vm.discussions.length;
               _.each(vm.discussions, _prepare);
            }

            function _prepare (discussion) {
               discussion.modifiedAt = moment(discussion.modifiedAt).format(TIME_FORMAT);
               discussion.frozen = !!discussion.frozen;
            }

            function _init () {
               searchDiscussionsEnd = swLongRunningOperation.start('searchDiscussions');
               swManageClassDiscussionsService.searchClassDiscussions(classId)
                  .then(function (response) {
                     _onUpdate(response);
                  })
                  .finally(function () {
                     searchDiscussionsEnd(); 
                  });
               swNotificationService.addNotificationListener('discussions', function () {
                  return {
                     classId: classId
                  };
               }, _onUpdate);
            }

            function _destroy () {
               swNotificationService.removeNotificationListener('discussions', _onUpdate);
            }

            function filterClassOnly (_discussion) {
               return !_discussion.locator;
            }

            function filterCurrent (_discussion) {
               return _discussion.locator && _discussion.unreadCount > 0;
            }

            function filterFuture (_discussion) {
               return _discussion.locator && (!_discussion.unreadCount || _discussion.unreadCount === 0);
            }

            function removeClassDiscussion (id) {
               var index = findDiscussionIndexById(id);
               if (index > -1) {
                  vm.discussions.splice(index, 1);
               }

               if (!vm.discussions.length) {
                  //go to first tab
                  return;
               }
            }

            function findDiscussionIndexById(id) {
               return _.findIndex(vm.discussions, function (d) {
                  return d._id === id;
               });
            }

            function goToDiscussion (_discussion) {
               if ( !_discussion.bookId ) {
                  return;
               }
               openStudyClass(_discussion);
            }

            function openStudyClass (_discussion) {
               var _path = _discussion.locator ? '#' + _discussion.locator : undefined;
               swOpenPublicationService.beginUserStudy(_discussion.bookId, _path, {
                  isStudyCourse  : vm.studyClass.studyCourseInfo.course.type === 'StudyCourse',
                  _studyCourseId : vm.studyClass.studyCourseInfo.course._id,
                  _classId       : classId,
                  type           : 'StudyClass',
                  isTeacher      : vm.isTeacher
               });
            }
            
            function createClassDiscussion() {
               var data = {
                  classId: vm.courseApi.classId,
                  userRole: 'Teacher'
               };

               swDiscussionsService.showDiscussionPopup(data, 'edit')
                  .promise.then(function (_discussionData) {
                     if ( _discussionData && _.isArray(vm.discussions) ) {
                        vm.isDiscussionsList = true;
                        vm.discussions.push(_discussionData);
                     }
                  });
            }
         }]
   });
});