define([
   'module',
   'underscore',
   'moment',
   'Context',
   'swComponentFactory',
   'text!./ManageStudyClass.html',
   'text!./ManageStudyClassMainMenu.html',
   'text!./ManageStudyClassSettingsMenu.html',
   'less!./ManageStudyClass.less'
], function (module, _, moment, Context, swComponentFactory, template, mainMenuTemplate, settingsMenuTemplate) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine: true,
      isolatedScope: {
         courseApi: '='
      },
      controller: [
         '$scope',
         '$timeout',
         'swStudyClassService',
         'swInviteToStudyClassService',
         'swManageStudyClassToolbarService',
         'swManagePersonalMessagesService',
         'swUserService',
         'swUserPublicationService',
         'swSubmachine',
         'swI18nService',
         'swNotificationService',
         'swDiscussionsService',
         'swPopupService',
         'swLayoutManager',
         function (
            $scope,
            $timeout,
            swStudyClassService,
            swInviteToStudyClassService,
            swManageStudyClassToolbarService,
            swManagePersonalMessagesService,
            swUserService,
            swUserPublicationService,
            swSubmachine,
            swI18nService,
            swNotificationService,
            swDiscussionsService,
            swPopupService,
            swLayoutManager) {

            var vm               = $scope;

            var usersArr         = [];
            var MS_IN_DAY        = 86400000;
            var mainMenu;
            var settingsMenu;

            var currentUserId    = swUserService.getUserId();

            var classTypes       = _.reduce(Context.parameters.studyProjectConfig.studyClassTypeEnum, _studyClassReducer, {});
            var DATE_TEMPLATE    = Context.parameters.defaultDateFormat;
            var teacherMenuItems = Context.parameters.manageStudyCourseConfig.menu.teacher;
            var studentMenuItems = Context.parameters.manageStudyCourseConfig.menu.student;

            function _studyClassReducer (memo, data) {
               memo[data.type] = swI18nService.getResource(data.label);
               return memo;
            }

            vm.studyClass              = {};
            vm.filter                  = {text: ''};
            vm.menuItems               = teacherMenuItems;
            vm.mainMenuTemplate        = mainMenuTemplate;
            vm.settingsMenuTemplate    = settingsMenuTemplate;
            vm.isTeacher               = true;
            vm.isShareClass            = true;
            vm.swApplicationScrollType = 'NONE';
            vm.isDiscussionView        = false;
            vm.discussionsApi          = {};

            vm.swSubmachine.configure({
               'Classroom': {
                  uri     : 'classroom',
                  history : false
               },
               'StudentsProgress': {
                  uri     : 'studentsprogress',
                  history : false
               },
               'Membership': {
                  uri     : 'membership',
                  history : false
               },
               'ManageClassDiscussion': {
                  uri     : 'manageclassdiscussion',
                  history : false
               }
            });

            swLayoutManager.register({
              id: vm.$id,
              layout: _layout
            });

            vm.sendMessage = function () {
               swManagePersonalMessagesService.sendMessage([], vm.courseApi.classId);
            };

            function _goToLibrary () {
               var deeplink = swManageStudyClassToolbarService.getButtonDeepLink('Library');
               if (deeplink) {
                  swSubmachine.deeplink(deeplink);
               }
            }

            function addClassInStudyActive () {
               swUserPublicationService.updateUserPublication({
                  publicationId      : vm.courseApi.classId,
                  readingDuration    : 0,
                  lastOpenedAt       : _.now(),
                  publicationType    : 'StudyClass',
                  currentStudyItemId : vm.studyClassInfo.studyCourseInfo.course._id
               });
            }

            function setStudentViewParams () {
               if ( !vm.studyClassInfo.class.allowDiscussions || vm.studyClassInfo.class.classType === 'Independent Study' ) {
                  delete studentMenuItems.ManageClassDiscussion;
               }
               vm.menuItems = studentMenuItems;
            }

            function setTeacherViewParams () {
               vm.menuItems = teacherMenuItems;
            }

            var summeryIsEmpty = function (summary) {
               return !(summary.numberOfInvitedStudents === 0 &&
                        summary.numberOfRequestedStudents === 0 &&
                        summary.numberOfStudents === 0);
            };

            var setClassType = function (classTypes, summary) {
               var independentStudyKey = 'CreateStudyProject.wizard.step2.independentStudy.type';
               var updatedClassTypes = _.clone(classTypes);

               if (summeryIsEmpty(summary) && _.has(updatedClassTypes, independentStudyKey)) {
                  delete updatedClassTypes[independentStudyKey];
               }
               return updatedClassTypes;
            };

            vm.swInit = function () {
               swNotificationService.addNotificationListener('searchUsersWithActivity', _getUserActivityParams, changeUsersActivity);
               swStudyClassService.getStudyClassInfo(vm.courseApi.classId)
                  .then(function (result) {
                     vm.studyClassInfo = result.data;
                     vm.studyClassInfo.setStudentViewParams = setStudentViewParams;
                     vm.studyClassInfo.setTeacherViewParams = setTeacherViewParams;
                     vm.isTeacher = vm.studyClassInfo.userRole === "Teacher" || vm.studyClassInfo.userRole === "TeacherAndStudent";
                     addClassInStudyActive();
                     vm.studyClassInfo.classTypes = setClassType(classTypes, vm.studyClassInfo.summary);
                     vm.studyClassInfo = prepareCourseDates(vm.studyClassInfo);
                     vm.goToItem('Classroom');

                     if ( vm.studyClassInfo.userRole === "Teacher" ) {
                        if ( vm.studyClassInfo.class.classType === 'Independent Study' ) {
                           setStudentViewParams();
                        }
                        swInviteToStudyClassService.setClassId(vm.courseApi.classId);
                        swInviteToStudyClassService.setAfterStudentInvitedFn(vm.refreshStudentsList);
                        vm.refreshStudentsList();

                        if ( vm.courseApi.isInviteVisible && vm.studyClassInfo.class.classType !== 'Independent Study' ) {
                           vm.showInvite();
                        }
                     }
                     else if ( vm.studyClassInfo.userRole === 'Student' ) {
                        setStudentViewParams();
                     }
                     else if ( vm.studyClassInfo.userRole === 'Invited student' ) {
                        var status = isJoinDateExpired() ? 'Declined' : 'Accepted';
                        swStudyClassService.persistClassStudentStatus(currentUserId, vm.courseApi.classId, [currentUserId], status, '')
                            .then(setStudentViewParams);
                     }
                     else if ( vm.studyClassInfo.userRole === undefined && vm.studyClassInfo.class.classType === 'Public' ) {
                        swStudyClassService.inviteStudentsToClass(vm.courseApi.classId, [currentUserId], '')
                            .then(setStudentViewParams);
                     }
                     else {
                        _goToLibrary();
                     }
                     swStudyClassService.setCurrentStudyClassInfo(vm.studyClassInfo);
                  }, _goToLibrary);
            };

            function _layout (context) {
              var e = context.events;
              if ( e.orienting || e.resizing ) {
                if ( mainMenu ) {
                  mainMenu.hide();
                }

                if ( settingsMenu ) {
                  settingsMenu.hide();
                }
              }
            }

            vm.swDestroy = function () {
               swNotificationService.removeNotificationListener('searchUsersWithActivity');
               swLayoutManager.unregister(vm.$id);
            };

            vm.isShareClass = function () {
               return vm.isTeacher && vm.studyClassInfo && vm.studyClassInfo.class.classType === 'Public';
            };

            vm.inviteRule = function () {
               return vm.isTeacher &&
                      vm.studyClassInfo &&
                      vm.studyClassInfo.class.classType !== 'Independent Study' && !isJoinDateExpired();
            };

            vm.sendMessageRule = function () {
              return vm.isTeacher && vm.studyClassInfo && vm.studyClassInfo.class.classType !== 'Independent Study';
            };

            vm.showInvite = function () {
               var studyClassInfo = {
                  class     : vm.studyClassInfo.class,
                  teachers  : vm.studyClassInfo.teachers,
                  isSharing : vm.isShareClass()
               };
               swInviteToStudyClassService.showInvite(studyClassInfo);
            };

            vm.showSettingsMenu = function showSettingsMenu() {
              return vm.isDiscussionView || vm.swSubmachine.state('Membership') || vm.inviteRule() && vm.sendMessageRule();
            };

            vm.resetSearch = function () {
               vm.filter.text = "";
               vm.refreshStudentsList();
            };

            vm.goToItem = function (key) {
               vm.activeMenuItem = key;
               vm.swSubmachine.go(key);
               if ( mainMenu ) {
                  mainMenu.hide();
               }
            };

            vm.refreshStudentsList = function () {
               swStudyClassService.searchClassStudents(vm.courseApi.classId, vm.filter.text)
                   .then(function (result) {
                      usersArr = result.data;
                      getImmediateUsersActivity();
                      changeUsersActivity();
                      vm.studentsApi.userRequests = [];
                      vm.studentsApi.classMembers = [];

                      _.each(usersArr, function (item) {
                         if ( item.photo ) {
                            item.photoLink = swUserService.getUserPhoto(item.photo.fileHash);
                         }
                         if (item.teacherConfirmationStatus === 'Requested') {
                            vm.studentsApi.userRequests.push(item);
                         }
                         else {
                            vm.studentsApi.classMembers.push(item);
                         }
                      });
                      usersArr = vm.studentsApi.classMembers = prepareStudentsList(vm.studentsApi.classMembers, vm.studyClassInfo.teachers);
                      vm.studyClassInfo.summary = {numberOfStudents: 0, numberOfRequestedStudents: 0, numberOfInvitedStudents: 0};

                      _.each(usersArr, function (student) {
                         if (student.studentConfirmationStatus === "Accepted" && student.teacherConfirmationStatus === "Accepted") {
                            vm.studyClassInfo.summary.numberOfStudents += 1;
                         }
                         else if (student.studentConfirmationStatus === "Requested" && student.teacherConfirmationStatus === "Accepted") {
                            vm.studyClassInfo.summary.numberOfInvitedStudents += 1;
                         }
                         else if (student.studentConfirmationStatus === "Accepted" && student.teacherConfirmationStatus === "Requested") {
                            vm.studyClassInfo.summary.numberOfRequestedStudents += 1;
                         }
                      });
                      vm.studyClassInfo.classTypes = setClassType(classTypes, vm.studyClassInfo.summary);
                   });
            };

            vm.toggleDiscussions = function () {
               vm.studyClassInfo.class.allowDiscussions = !vm.studyClassInfo.class.allowDiscussions;
               hideSettingsMenu();
            };

            vm.createClassDiscussion = function () {
               var data = {
                  classId: vm.courseApi.classId,
                  userRole: vm.studyClassInfo.userRole
               };

               swDiscussionsService.showDiscussionPopup(data, 'edit')
                  .promise.then(function (_discussionData) {
                     if ( _.isArray(vm.discussionsApi.discussions) && _discussionData ) {
                        vm.discussionsApi.discussions.push(_discussionData);
                     }
                  });
            };

            function prepareStudentsList (_students, _teachers) {
               var students = _convertArrayIntoObj(_students, 'userId'),
                   teachers = _convertArrayIntoObj(_teachers, 'userId');

               return _.values(_.extend(students, teachers));

               function _convertArrayIntoObj (_students, _prop) {
                  return _students.reduce(function (_result, _s) {
                     _s.isTeacher = _s.role === 'Teacher' || _s.role === 'TeacherAndStudent';
                     _result[_s[_prop]] = _s;
                     return _result;
                  }, {});
               }
            }

            function prepareCourseDates (classInfo) {
               var classDates = {};
               var _class     = classInfo.class;
               var _course    = classInfo.studyCourseInfo.course;
               var daysCount  = Math.floor(_course.readingTime / _class.expectedDuration);
               var endCourse;

               classDates.classScheduledAt = _class.scheduledAt ? formatDate(_class.scheduledAt) : formatDate(new Date());

               if ( _class.expectedDailyWork && _class.joinEndDate ) {
                  classDates.joinEndDate = formatDate(_class.joinEndDate);
                  endCourse              = new Date(classDates.classScheduledAt).getTime() + daysCount * MS_IN_DAY;
                  classDates.endCourse   = formatDate(endCourse);
               }
               return _.extend(classInfo, classDates);

               function formatDate (_date) {
                  return moment(_date).format(DATE_TEMPLATE);
               }
            }

            function isJoinDateExpired() {
               return !vm.studyClassInfo.class.expectedDailyWork ? false : new Date().getTime() > new Date(vm.studyClassInfo.class.joinEndDate).setHours(23, 59, 59, 999);
            }

            function getImmediateUsersActivity () {
               swNotificationService.ping();
            }

            function changeUsersActivity (usersActivities) {
               $timeout(function () {
                  var activities = _getUsersActivitiesByUid(usersActivities);
                  _setUserStatuses(activities, usersArr);
               });
            }

            function _setUserStatuses ( activities, classStudents ) {
               _.each(classStudents, function (_s) {
                  var current = activities[_s.userId];
                  if ( current ) {
                     _s.isOnline = current.actual;
                     _s.lastOnline = !_s.isOnline && moment(current.lastActive).fromNow();
                  }
               });
            }

            function _getUsersActivitiesByUid (usersActivities) {
               var usersActivitiesByUid = {};
               _.each(usersActivities, function (_activity) {
                  var uid = _activity.user && _activity.user.userId;
                  usersActivitiesByUid[uid] = _activity;
               });
               return usersActivitiesByUid;
            }

            function _getUserActivityParams () {
               return {
                  activity : {
                     name            : 'Class',
                     relatedEntityId : vm.courseApi.classId
                  },
                  contextActivity : null,
                  activeOnly      : false
               };
            }

            vm.swSubmachine.$onManageClassDiscussion$enter = function () {
               vm.isDiscussionView = true;
            };

            vm.swSubmachine.$onManageClassDiscussion$leave = function () {
               vm.isDiscussionView = false;
               swStudyClassService.persistStudyClass(vm.studyClassInfo.class, 'updateClass');
            };

            vm.studentsApi = {
               classMembers        : [],
               refreshStudentsList : vm.refreshStudentsList
            };

            vm.toggleMainMenu = function (_ev) {
               if ( !mainMenu || mainMenu.isHidden() ) {
                  mainMenu = swPopupService.show(configureDropDown({
                     event     : _ev,
                     className : 'manage-study-class-main-menu',
                     template  : mainMenuTemplate,
                     layout : {
                       of: {
                          clientRect: _ev && _ev.currentTarget.getClientRects()[0]
                       },
                       my: 'CB',
                       at: 'CT',
                       arrow: true
                    }
                  }));
               }
               return mainMenu;
            };

            vm.toggleSettingsMenu = function (_ev) {
               if ( !settingsMenu || settingsMenu.isHidden() ) {
                  settingsMenu = swPopupService.show(configureDropDown({
                     event     : _ev,
                     className : 'manage-study-class-social-menu',
                     template  : settingsMenuTemplate,
                     layout : {
                       of: {
                          clientRect: _ev && _ev.currentTarget.getClientRects()[0]
                       },
                       my: 'RT',
                       at: 'RB',
                       arrow: true
                    }
                  }));
               }
               return settingsMenu;
            };

            vm.getLabel = function (_label) {
               return swI18nService.getResource(_label);
            };

            function hideSettingsMenu () {
               if ( settingsMenu ) {
                  settingsMenu.hide();
               }
            }

            function configureDropDown (_options) {
               return {
                  template        : _options.template,
                  scope           : vm,
                  backdropVisible : true,
                  customClass     : _options.className,
                  layout          : _options.layout
               };
            }
         }]
   });
});