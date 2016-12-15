define([
   'module',
   'moment',
   'underscore',
   'Context',
   'swComponentFactory',
   'text!./BeginNewCourse.html',
   'less!./BeginNewCourse.less'
], function (module, moment, _, Context, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         publicationData: '=',
         detailsApi: '=',
         headerfn: '='
      },
      controller: [
         '$scope',
         'swStudyClassService',
         'swCreateStudyProjectService',
         'swUserService',
         'swUserPublicationService',
         function (
            $scope,
            swStudyClassService,
            swCreateStudyProjectService,
            swUserService,
            swUserPublicationService
         ) {

            var vm = $scope;

            vm.upcomingCourses = [];
            vm.renderButton = {};

            vm.isUpcomingCourses = false;

            vm.filter = {
               text: ''
            };

            var classId;
            var isFilterApplied = false;
            var userId          = swUserService.getUserId();
            var DATE_FORMAT     = Context.parameters.defaultDateFormat;
            var currentDate     = new Date().getTime();

            vm.swInit              = _init;
            vm.createNewCourse     = createNewCourse;
            vm.toggleCourseDetails = toggleCourseDetails;
            vm.joinCourse          = joinCourse;
            vm.sendRequest         = sendRequest;
            vm.onFiltering         = onFiltering;
            vm.resetFilter         = resetFilter;

            function _init() {
               prepareBasePublication();
            }

            function createNewCourse() {
               swCreateStudyProjectService.showCreateStudyProjectPopup({id: classId});

               if ( typeof vm.headerfn === 'object' ) {
                  vm.headerfn.close();
               }
            }

            function toggleCourseDetails(index) {
               vm.currentIdx = index; //TODO
            }

            function joinCourse(index) {
               swStudyClassService.resumeCourse({classId: vm.upcomingCourses[index].class.classId});
            }

            function sendRequest(index) {
               swStudyClassService.inviteStudentsToClass(vm.upcomingCourses[index].class.classId, [userId], 'Please add me to class ' + vm.upcomingCourses[index].class.name)
                  .then(function () {
                     vm.upcomingCourses[index].membership = {
                        studentConfirmationStatus: 'Accepted',
                        teacherConfirmationStatus: 'Requested'
                     };
                  });
            }

            function onFiltering() {
               searchStudyClasses();
            }

            function resetFilter() {
               vm.filter.text = '';
               searchStudyClasses();
            }

            vm.renderButton = {
               joinCourse: function (course) {
                  return (course.class.classType === 'Public' &&
                         (!course.membership || course.membership && (course.membership.teacherConfirmationStatus !== 'Accepted' ||
                         (course.membership.teacherConfirmationStatus === 'Accepted' && course.membership.studentConfirmationStatus === 'Requested')))) ||
                         (course.class.classType === 'Moderated' && course.membership && course.membership.studentConfirmationStatus === 'Requested');
               },
               joined: function (course) {
                  return (course.class.classType === 'Public' || course.class.classType === 'Moderated') &&
                         course.membership &&
                         course.membership.studentConfirmationStatus === 'Accepted' &&
                         course.membership.teacherConfirmationStatus === 'Accepted';
               },
               sendRequest: function (course) {
                  return course.class.classType === 'Moderated' &&
                         (!course.membership || course.membership &&
                         course.membership.teacherConfirmationStatus !== 'Accepted' && course.membership.teacherConfirmationStatus !== 'Requested');
               },
               requested: function (course) {
                  return course.class.classType === 'Moderated' && course.membership &&
                         course.membership.studentConfirmationStatus === 'Accepted' &&
                         course.membership.teacherConfirmationStatus === 'Requested';
               }
            };

            function searchStudyClasses() {
               if ( !classId ) {
                  return false;
               }

               swStudyClassService.searchStudyClassesByPublication(classId, vm.filter.text, '')
                  .then(function (response) {
                     vm.upcomingCourses = response.data;

                     vm.upcomingCourses = _.map(vm.upcomingCourses, function (course) {
                        if ( currentDate < course.class.joinEndDate || !course.class.joinEndDate ) {
                           course.class.scheduledAt = moment(course.class.scheduledAt).format(DATE_FORMAT);
                           course.class.teacher = course.teachers[0].firstName + ' ' + course.teachers[0].lastName;
                           course.membership = _.where(course.membership, {'studentId': userId})[0];

                           return course;
                        }
                     });

                     vm.upcomingCourses = _.filter(vm.upcomingCourses,
                        function (item) {
                           return item !== undefined;
                        });

                     if ( !isFilterApplied ) {
                        isFilterApplied = true;
                        vm.isUpcomingCourses = !_.isEmpty(vm.upcomingCourses);
                     }
                  });
            }

            function prepareBasePublication() {
               vm.publicationData = vm.publicationData || swUserPublicationService.getLastRecentItem();

               if ( vm.publicationData.type === 'StudyClass' ) {
                  vm.publicationData = {};
                  return false;
               }

               classId = vm.publicationData.courseId || vm.publicationData._id;
               searchStudyClasses();
            }

            vm.back = typeof vm.detailsApi === 'object' && vm.detailsApi.back;
         }]
   });
});