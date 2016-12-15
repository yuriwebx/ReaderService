define([
   'module',
   'moment',
   'swComponentFactory',
   'Context',
   'underscore',
   'text!./Classroom.html',
   'text!./../searchteachersforstudyclass/SearchTeachersForStudyClass-header.html',
   'less!./Classroom.less'
], function (
   module,
   moment,
   swComponentFactory,
   Context,
   _,
   template,
   inviteTeachersToStudyClassHeader) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         studentsApi: '=',
         studyClassInfo: '=',
         isTeacher: '='
      },
      submachine: true,
      controller: [
         '$scope',
         '$window',
         'swStudyClassService',
         'swManageTestsService',
         'swPublicationsService',
         'swUserPublicationService',
         'swManageStudyClassToolbarService',
         'swOpenPublicationService',
         'swValidationService',
         'swUserStudyService',
         'swUserService',
         'swI18nService',
         'swPopupService',
         'swApplicationMenuService',
         'swSubmachine',
         function (
            $scope,
            $window,
            swStudyClassService,
            swManageTestsService,
            swPublicationsService,
            swUserPublicationService,
            swManageStudyClassToolbarService,
            swOpenPublicationService,
            swValidationService,
            swUserStudyService,
            swUserService,
            swI18nService,
            swPopupService,
            swApplicationMenuService,
            swSubmachine) {

            var vm                  = $scope;
            var durationsConfig     = Context.parameters.studyProjectConfig.studyClassDurations;
            var membershipStatuses  = Context.parameters.studyProjectConfig.membershipStatus;
            var DATE_FORMAT         = Context.parameters.defaultDateFormat;
            var INPUT_DATE_FORMAT  = Context.parameters.inputDateFormat;
            var classTypes          = Context.parameters.studyProjectConfig.studyClassTypeEnum;
            var currentUserId       = swUserService.getUser().userId;
            var removedTeachers     = [];
            var editData            = {};
            var MAX_IMG_SIZE        = 5 * 100 * 1000; //max allowed for uploading Image Size
            var hourTime            = 3600000;
            var progressInterval    = 3;
            var searchTeachersPopup = false;
            var isSelfRemove        = false;
            var classStudentsCount  = vm.studyClassInfo.summary.numberOfStudents;
            var classId                 = vm.studyClassInfo.class.classId;
            var author                  = _.map(vm.studyClassInfo.teachers, function (teacherProfile) {
               return teacherProfile.firstName + ' ' + teacherProfile.lastName;
            }).join(', ');

            vm.currentClassType = _.findWhere(Context.parameters.studyProjectConfig.studyClassTypeEnum, {
               type: vm.studyClassInfo.class.classType
            });
            vm.isImageEmpty                       = true;
            vm.leadStudentsCounter                = 0;
            vm.lowProgressStudentsCounter         = 0;
            vm.activeButtons                      = {};
            vm.studyClassInfo.class.studyWeekDays = vm.studyClassInfo.class.studyWeekDays || []; //for old courses
            vm.isCoursePeriodBlockDisabled        = !vm.studyClassInfo.class.scheduledAt;

            vm.swInit                  = _init;
            vm.showDifficulty          = swPublicationsService.showDifficulty;
            vm.setViewParams           = setViewParams;
            vm.getCurrentClassType     = getCurrentClassType;
            vm.changeDuration          = changeDuration;
            vm.changeStudyWeekDays     = changeStudyWeekDays;
            vm.showEditButton          = showEditButton;
            vm.uploadImage             = uploadImage;
            vm.isNotIndependentStudy   = isNotIndependentStudy;
            vm.validateEndJoinDate     = validateEndJoinDate;
            vm.setSelection            = setSelection;
            vm.isStudyCourse           = isStudyCourse;
            vm.addTeachers             = addTeachers;
            vm.removeTeacher           = removeTeacher;
            vm.isRemoveTeacherAllowed  = isRemoveTeacherAllowed;
            vm.formatDate              = formatDate;
            vm.isAuthorInTitle         = isAuthorInTitle;
            vm.isDownloadAvailable     = isDownloadAvailable;
            vm.toggleCoursePeriodBlock = toggleCoursePeriodBlock;
            vm.onStudy                 = onStudy;

            vm.daysOfWeek = _.map(Context.parameters.daysOfWeek, function (day, index) {
               var weekDay = swI18nService.getResource(day);
               vm.activeButtons[index] = _.contains(vm.studyClassInfo.class.studyWeekDays, weekDay);
               return weekDay;
            });

            function _init () {
               toggleCoursePeriodBlock(!!vm.studyClassInfo.class.expectedDailyWork);
               _setCourseDates();
               _prepareCourseImages();
               swManageStudyClassToolbarService.setOnStudyPublicationFn(onStudyPublication);
               swUserStudyService.searchUserStudy(classId, '', '', progressInterval, classStudentsCount)
                  .then(countUsersRating);


               if(vm.studyClassInfo.studyCourseInfo.course.type === 'StudyCourse' && vm.studyClassInfo.studyCourseInfo.details.length === 0){
                  vm.logger.warn('No items at syllabus!');
               }
               function countUsersRating (result) {
                  var expectedReadingTime = result.data.middleParams.expectedTotalReadingTime;
                  var totalReadingProgress = _.map(result.data.usersProgress, function (userProgress) {
                     return Math.max.apply(this, _.map(userProgress.progress, _.property('totalReadingDuration')));
                  });
                  _.each(totalReadingProgress, _updateStudentsActivityCounters);

                  function _updateStudentsActivityCounters (totalProgress) {
                     if ( totalProgress < (expectedReadingTime * 0.9) ) {
                        vm.lowProgressStudentsCounter++;
                     }
                     else if ( totalProgress > (expectedReadingTime * 1.1) ) {
                        vm.leadStudentsCounter++;
                     }
                  }
               }
            }

            vm.classTypesOptions = {
               popupCustomClass: 'classtypes',
               id: function (item) {
                  item.disabled = function () {
                     return item.type === 'Independent Study' &&
                            ( vm.studyClassInfo.summary.numberOfStudents        > 0 ||
                              vm.studyClassInfo.summary.numberOfInvitedStudents > 0 ||
                              vm.studyClassInfo.teachers.length                 > 1 );
                  };
               },
               data: function () {
                  return classTypes;
               },
               format: function (category) {
                  return swI18nService.getResource(category.label);
               }
            };

            vm.currentDurationOptions = {
               popupCustomClass: 'durations',
               data: function () {
                  return _getDurations();
               },
               format: function (category) {
                  return category;
               }
            };

            function _setCourseDates () {
               var currentDuration = vm.studyClassInfo.class.expectedDailyWork || hourTime;
               vm.studyClassInfo.currentDuration = getDailyTimeInViewMode(currentDuration);
               changeDuration(vm.studyClassInfo.currentDuration);
            }

            function _prepareCourseImages() {
               var _studyCourseInfo = vm.studyClassInfo.studyCourseInfo;
               var _studyClassInfo = vm.studyClassInfo.class;
               var _courseCover = _studyCourseInfo.course && _studyCourseInfo.course.cover;
               if ( _studyClassInfo.cover ) {
                  vm.imgPreviewSrc = swManageTestsService.getTestFileSource(_studyClassInfo.cover);
               }
               if ( _courseCover ) {
                  if(_studyCourseInfo.course.bookId && _studyCourseInfo.course.bookCover){
                     vm.imgPreviewSrcInfo = swPublicationsService.getCoverPath({
                        id : _studyCourseInfo.course.bookId,
                        cover : _studyCourseInfo.course.bookCover
                     }, 'large');
                  }
                  else {
                     vm.imgPreviewSrcInfo = swPublicationsService.getCoverPath(_studyCourseInfo.course, 'large');
                  }
               }
               _.each(vm.studyClassInfo.teachers, function (teacher) {
                  teacher.photoLink = (teacher.photo && teacher.photo.fileHash) ? swUserService.getUserPhoto(teacher.photo.fileHash) : '';
               });
               if ( _studyCourseInfo && _studyCourseInfo.details ) {
                  _studyCourseInfo.details.forEach(function (el) {
                     if ( el.type !== 'study guide' ) {
                        el.coverSrc = swPublicationsService.getCoverPath(el, 'large');
                     }
                  });
               }
               vm.studyClassInfo.class.coverSrc = vm.imgPreviewSrc;
            }

            function setViewParams (classType) {
               vm.studyClassInfo.class.classType = classType.type;
               vm.currentClassType = classType;
               if ( classType === 'Independent Study' ) {
                  delete vm.studyClassInfo.class.joinEndDate;
               }
               else {
                  vm.studyClassInfo.class.joinEndDate = vm.studyClassInfo.class.classScheduledAt;
               }
            }

            function getCurrentClassType() {
               return swI18nService.getResource(vm.currentClassType.label);
            }

            //edit functions
            vm.editData = {
               description: vm.studyClassInfo.class.description
            };

            vm.editMode = {
               teachers : false,
               info     : false
            };

            vm.editConfig = {
               info: {
                  edit            : editInfo,
                  save            : saveInfo,
                  cancel          : cancelInfoEdit,
                  showEditButtons : function () {
                                       return showEditButtons('info');
                                    }
               },
               teachers : {
                  edit            : editTeachers,
                  save            : saveTeachers,
                  cancel          : cancelTeachersEdit,
                  showEditButtons : function () {
                                       return showEditButtons('teachers');
                                    }
               }
            };

            function saveInfo () {
               swValidationService.setValidationMessagesEnabled(vm.form, true);
               if ( vm.form.$valid && vm.studyClassInfo.class.studyWeekDays.length > 0 ) {
                  vm.editMode.info = !vm.editMode.info;
                  _setDefaultCourseData();
                  persistStudy().then(function () {
                     swUserPublicationService.updateTitleLastRecentItem(vm.studyClassInfo.class.name, author);
                     if ( vm.studyClassInfo.class.classType === 'Public' && vm.studentsApi.userRequests.length > 0 ) {
                        var requestedUserIds = _.map(vm.studentsApi.userRequests, function (user) {
                           return user.userId;
                        });
                        swStudyClassService.persistClassStudentStatus(currentUserId, classId, requestedUserIds, 'Accepted', '');
                     }
                  });

                  if ( vm.studyClassInfo.class.classType === 'Independent Study' ) {
                     vm.studyClassInfo.setStudentViewParams();
                  }
                  else {
                     vm.studyClassInfo.setTeacherViewParams();
                  }
                  vm.swSubmachine.event('persist');
               }
            }

            function editInfo () {
               editData = vm.studyClassInfo.class;
               if ( vm.studyClassInfo.class.classType !== 'Independent Study' ) {
                  editData.joinEndDate = vm.studyClassInfo.class.joinEndDate;
               }
               vm.studyClassInfo.class.scheduledAt = formatDate(vm.studyClassInfo.class.scheduledAt, INPUT_DATE_FORMAT);
               vm.studyClassInfo.class.joinEndDate = formatDate(vm.studyClassInfo.class.joinEndDate, INPUT_DATE_FORMAT);
               vm.editMode.info = !vm.editMode.info;
            }

            function cancelInfoEdit () {
               vm.studyClassInfo.class = _.extend(vm.studyClassInfo.class, editData);
               vm.editMode.info = false;
            }

            function saveTeachers () {
               vm.swSubmachine.event('persist');
               persistStudy().then(function () {
                  vm.editMode.teachers = !vm.editMode.teachers;

                  if ( removedTeachers.length ) {
                     isSelfRemove = !!_.find(removedTeachers, function (_t) {
                        return _t.userId === currentUserId;
                     });
                     _persistTeachersStatus(currentUserId, classId, removedTeachers, membershipStatuses.declined)
                        .then(function () {
                           if ( isSelfRemove ) {
                              swApplicationMenuService.selectMenuItem('Library');
                           }
                           removedTeachers = [];
                           isSelfRemove = false;
                        });
                  }
               });
            }

            function editTeachers () {
               vm.editMode.teachers = !vm.editMode.teachers;
            }

            function cancelTeachersEdit () {
               vm.editMode.teachers = false;
            }

            function showEditButtons(_mode) {
               return !vm.editMode[_mode];
            }

            function _setDefaultCourseData() {
               if ( vm.isCoursePeriodBlockDisabled ) {
                  delete vm.studyClassInfo.class.expectedDailyWork;
                  delete vm.studyClassInfo.endCourse;
               }
               else {
                  vm.studyClassInfo.class.joinEndDate = !!_.trim(vm.studyClassInfo.class.joinEndDate) && vm.studyClassInfo.class.joinEndDate || editData.joinEndDate;
                  vm.studyClassInfo.class.joinEndDate = moment(vm.studyClassInfo.class.joinEndDate).endOf('day').valueOf();
               }

               if ( vm.isCoursePeriodBlockDisabled || vm.studyClassInfo.class.classType === 'Independent Study' ) {
                  delete vm.studyClassInfo.class.joinEndDate;
               }
               vm.studyClassInfo.class.scheduledAt = !!_.trim(vm.studyClassInfo.class.scheduledAt) && vm.studyClassInfo.class.scheduledAt || editData.scheduledAt;
               vm.studyClassInfo.class.scheduledAt = moment(vm.studyClassInfo.class.scheduledAt).startOf('day').valueOf() || 0;
               vm.studyClassInfo.class.description = !!_.trim(vm.editData.description) && vm.editData.description ||
                                                     'This Project was created for studying ' + vm.studyClassInfo.studyCourseInfo.course.title;
            }

            function changeDuration (currentDuration) {
               if ( !vm.isCoursePeriodBlockDisabled ) {
                  var readingTime = currentDuration && currentDuration !== null ? currentDuration.match(/^\d\.*\d*/) : '0.5';
                      readingTime = readingTime !== null ? parseFloat(readingTime[0]) * hourTime : 1;

                  var classScheduledAt = new Date(vm.studyClassInfo.class.scheduledAt).getTime();
                      classScheduledAt = isNaN(classScheduledAt) ? Date.now() : classScheduledAt;

                  if ( vm.studyClassInfo.class.joinEndDate ) {
                     formatDate(vm.studyClassInfo.class.joinEndDate);
                  }

                  vm.studyClassInfo.class.expectedDailyWork = readingTime;
                  vm.studyClassInfo.class.currentDuration   = getDailyTimeInViewMode(readingTime);
                  vm.studyClassInfo.class.expectedDuration  = readingTime;
                  vm.studyClassInfo.endCourse = swStudyClassService.countEndCourseDate({
                     startDate      : classScheduledAt,
                     studyWeekDays  : vm.studyClassInfo.class.studyWeekDays,
                     timeInMsPerDay : vm.studyClassInfo.class.expectedDailyWork,
                     allReadingTime : vm.studyClassInfo.studyCourseInfo.course.readingTime
                  }).format(DATE_FORMAT);
               }
            }

            function changeStudyWeekDays(dayOfWeek, index) {
               if ( !vm.editMode.info ) {
                  return false;
               }
               var isElement = _.indexOf(vm.studyClassInfo.class.studyWeekDays, dayOfWeek) === -1;
               if ( isElement ) {
                  vm.studyClassInfo.class.studyWeekDays.push(dayOfWeek);
               }
               else {
                  vm.studyClassInfo.class.studyWeekDays = _.without(vm.studyClassInfo.class.studyWeekDays, dayOfWeek);
               }

               vm.activeButtons[index] = isElement;
               vm.changeDuration(vm.studyClassInfo.currentDuration);
            }

            function showEditButton () {
               return vm.isTeacher;
            }

            function uploadImage (fileData) {
               vm.fileType = /\w*\//.exec(fileData.type)[0].replace('/', '');

               if ( vm.fileType !== 'image' || fileData.size > MAX_IMG_SIZE ) {
                  return;
               }
               else {
                  swManageTestsService.uploadAttachment(fileData)
                     .then(function (data) {
                        vm.studyClassInfo.class.cover = data.fileHash;
                        vm.isImageEmpty = false;
                        vm.studyClassInfo.class.coverSrc = $window.URL.createObjectURL(fileData);
                        swStudyClassService.persistStudyClass(vm.studyClassInfo.class, 'updateClass');
                     });
               }
            }

            function isNotIndependentStudy () {
               return vm.studyClassInfo && vm.studyClassInfo.class.classType !== 'Independent Study';
            }

            function validateEndJoinDate () {
               return !vm.studyClassInfo.class.joinEndDate ? true : {
                  dateRange: {
                     value : vm.studyClassInfo.class.joinEndDate,
                     min   : vm.studyClassInfo.class.scheduledAt,
                     max   : vm.studyClassInfo.class.endCourse
                  }
               };
            }

            function onStudyPublication () {
               swOpenPublicationService.beginUserStudy(vm.studyClassInfo.studyCourseInfo.course._id, '', {
                  isStudyCourse : vm.studyClassInfo.studyCourseInfo.course.type === 'StudyCourse',
                  _classId      : classId,
                  type          : 'StudyClass',
                  isTeacher     : vm.isTeacher
               });
            }

            function setSelection (index) {
               _setSelection(index);
            }

            function isStudyCourse (publication) {
               return publication.type === 'StudyCourse' ||
                      publication.publicationType === 'StudyCourse' ||
                      (publication.type || '').replace(/\s/g, '') === 'StudyClass';
            }

            function addTeachers () {
               openSearchTeachersPopup();
            }

            function removeTeacher (teacher) {
               removedTeachers.push(teacher);
               vm.studyClassInfo.teachers = _.filter(vm.studyClassInfo.teachers,
                  function (_t) {
                     return _t.userId !== teacher.userId;
                  });
            }

            function isRemoveTeacherAllowed (teacher) {
               return teacher.role === 'TeacherAndStudent';
            }

            function openSearchTeachersPopup (element) {
               vm.popupConfig = {
                  headerFn: {
                     persist: function () {
                        if ( searchTeachersPopup ) {
                           _persistTeachersStatus(currentUserId, classId, vm.studyClassInfo.teachers, membershipStatuses.accepted)
                              .then(function () {
                                 searchTeachersPopup.hide();
                              });
                        }
                        return false;
                     }
                  },
                  classId  : classId,
                  teachers : vm.studyClassInfo.teachers
               };

               if ( !searchTeachersPopup || searchTeachersPopup.isHidden() ) {
                  searchTeachersPopup = _showPopupFn({
                     target    : element,
                     className : 'search-teachers-popup',
                     header    : inviteTeachersToStudyClassHeader,
                     template  : '<sw-search-teachers-for-study-class popup-config="popupConfig"></sw-search-teachers-for-study-class>'
                  });

                  searchTeachersPopup.promise.then(function () {
                     _persistTeachersStatus(currentUserId, classId, vm.studyClassInfo.teachers, membershipStatuses.accepted);
                  });
               }
            }

            function formatDate (_date, _template) {
               _template = _template || DATE_FORMAT;
               return moment(_date).format(_template);
            }

            function isAuthorInTitle(publication) {
               //TODO: need add language for courses
               return publication && !swPublicationsService.isAuthorInBookTitle(
                     publication.bookAuthor || publication.author,
                     publication.bookName || publication.name,
                     publication.language);
            }

            function _showPopupFn (config) {
               return swPopupService.show({
                  scope           : vm,
                  layout          : {},
                  target          : config.target,
                  backdropVisible : true,
                  customClass     : config.className,
                  header          : config.header,
                  content         : config.template,
                  footer          : ''
               });
            }

            function _persistTeachersStatus (_uid, _classId, _arr, _status) {
               var ids = _.map(_arr, function (_t) {
                  return _t.userId;
               });
               return swStudyClassService.persistClassTeachersStatus(_uid, _classId, ids, _status);
            }

            function _setSelection (oldIndex, newIndex) {
               vm.selected.item = (newIndex !== 'undefined' && newIndex >= 0) ? newIndex : oldIndex;
            }

            function _getDurations () {
               var durations = [],
                   min = durationsConfig.min;

               while ( min <= durationsConfig.max ) {
                  var duration = min + ' hours';

                  if ( min === 0.5 || min === 1 ) {
                     duration = min + ' hour';
                  }
                  durations.push(duration);
                  min += durationsConfig.step;
               }
               return durations;
            }

            function isDownloadAvailable() {
               return swPublicationsService.isFSAvailable();
            }

            function toggleCoursePeriodBlock (_isEnabled) {
               if ( !vm.editMode.info ) {
                  return false;
               }

               vm.isCoursePeriodBlockDisabled = ( typeof _isEnabled === 'boolean') ? !_isEnabled
                                                                                   : !vm.isCoursePeriodBlockDisabled;
               if ( !vm.isCoursePeriodBlockDisabled ) {
                  _setCourseDates();
               }
            }

            function getDailyTimeInViewMode(_dailyTimeInMs) {
               var currentDuration = Math.floor(_dailyTimeInMs / hourTime / 0.5) / 2;
               return currentDuration === 0.5 || currentDuration === 1 ? currentDuration + ' hour' : currentDuration + ' hours';
            }

            function persistStudy () {
               return swStudyClassService.persistStudyClass(vm.studyClassInfo.class, 'updateClass');
            }

            function onStudy () {
               var deeplink = swManageStudyClassToolbarService.getButtonDeepLink('ResumeStudy');
               if ( deeplink ) {
                  swSubmachine.deeplink(deeplink);
               }
            }
         }]
   });
});