define([
   'module',
   'underscore',
   'swServiceFactory',
   'moment'
], function (module, _, swServiceFactory, moment) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
         'swRestService',
         'swAgentService',
         function (
            swRestService,
            swAgentService) {
            var resumeCourseFn;
            var info;

            this.getStudyClassInfo               = getStudyClassInfo;
            this.isIndependentStudy              = isIndependentStudy;
            this.persistStudyClass               = persistStudyClass;
            this.searchClassStudentActions       = searchStudentActions;
            this.searchClassStudents             = searchClassStudents;
            this.persistClassStudentStatus       = persistStudentStatus;
            this.cancelStudyClass                = cancelStudyClass;
            this.inviteStudentsToClass           = inviteStudents;
            this.searchStudentsForClass          = searchStudents;
            this.searchStudyClasses              = searchStudyClasses;
            this.searchStudyClassesByPublication = searchStudyClassesByPublication;
            this.resumeCourse                    = resumeCourse;
            this.setResumeCourseFn               = setResumeCourseFn;
            this.countEndCourseDate              = countEndDate;
            this.persistClassTeachersStatus      = persistTeachersStatus;
            this.searchTeachersForClass          = searchTeachers;
            this.getStudyClassSettings           = getStudyClassSettings;

            //< TODO temporary solution, later will be changed
            this.getCurrentStudyClassInfo = function () {
               return info;
            };

            this.setCurrentStudyClassInfo = function getStudyClassInfo (data) {
               info = data;
            };
            //>
            
            function getStudyClassInfo (classId) {
               var data = {
                  classId: classId
               };
               return swAgentService.request('get', 'StudyClass', 'info', data);
            }
            
            function isIndependentStudy () {
               return info && info.class && info.class.classType === 'Independent Study';
            }

            function getStudyClassSettings () {
               if (!_.has(info, 'class')) {
                  return {};
               }
               return {
                  isIndependentStudy : info.class.classType === 'Independent Study',
                  isDiscussionsAllow : info.class.allowDiscussions
               };
            }
            
            function persistStudyClass (studyClass, type) {
               //possible types: 'updateClass' , 'createByPublicationId', 'createByClassId'
               //'createByPublicationId' - required parameter publicationId
               //'createByClassId'       - required parameter classId
               var data = {
                  studyClass: studyClass,
                  type: type
               };
               return swAgentService.request('post', 'StudyClass', 'persist', data);
            }
           
            function searchStudentActions (userId, classId, studentId) {
               var data = {
                  userId: userId,
                  classId: classId,
                  studentId: studentId
               };
               return swRestService.restSwHttpRequest('get', 'StudyClass', 'studentactions', data);
            }

            function searchClassStudents (classId, filter, itemsCount) {
               var data = {
                  classId: classId,
                  filter: filter,
                  itemsCount: itemsCount
               };
               return swAgentService.request('get', 'StudyClass', 'searchstudents', data);
            }

            function persistStudentStatus (userId, classId, studentIds, status, comment) {
               var data = {
                  userId: userId,
                  classId: classId,
                  studentIds: studentIds,
                  status: status,
                  comment: comment
               };
               return swAgentService.request('post', 'StudyClass', 'persiststudentstatus', data);
            }

            function cancelStudyClass (classId, comment) {
               var data = {
                  classId: classId,
                  comment: comment
               };
               return swAgentService.request('post', 'StudyClass', 'cancelstudyclass', data);
            }

            function inviteStudents (classId, userIds, comment) {
               var data = {
                  classId: classId,
                  userIds: userIds,
                  comment: comment
               };
               return swAgentService.request('post', 'StudyClass', 'invitestudents', data);
            }

            function searchStudents (classId, filter, itemsCount) {
               var data = {
                  classId: classId,
                  filter: filter,
                  itemsCount: itemsCount
               };
               return swAgentService.request('get', 'StudyClass', 'searchstudentsforclass', data);
            }
            
            function searchStudyClasses () {
               var data = {};
               return swAgentService.request('get', 'StudyClass', 'searchstudyclasses', data);
            }

            function searchStudyClassesByPublication (publicationId, filter, itemsCount) {
               var data = {
                  publicationId: publicationId,
                  filter       : filter,
                  itemsCount   : itemsCount
               };
               return swAgentService.request('get', 'StudyClass', 'searchbypublication', data);
            }

            function resumeCourse (courseApi) {
               resumeCourseFn(courseApi);
            }

            function setResumeCourseFn (fn) {
               resumeCourseFn = fn;
            }

            // All params are mandatory:
            // options = {
            //    - startDate;
            //    - studyWeekDays;
            //    - timeInMsPerDay;
            //    - allReadingTime;
            // };
            var daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            function countEndDate ( options ) {
               var _options            = options || {},
                   _startDate          = new Date(_options.startDate).setHours(0, 0, 0, 0),
                   _msPerDay           = _options.timeInMsPerDay,
                   _courseDurationInMs = _options.allReadingTime,
                   _studyWeekDays      = _.intersection(daysOfWeek, _options.studyWeekDays) || [],
                   _startDayNum        = moment(_startDate).isoWeekday(),
                   _firstWeekDaysCount = 0,
                   _msPerWeek          = _studyWeekDays.length * _msPerDay,
                   _fullWeeksCount,
                   _lastWeekTimeInMs   = 0,
                   _lastWeekDaysCount  = 0,
                   _endDate            = moment(_startDate),
                   _overDays           = 0,
                   _firstWeekEndDay;

               for ( var i = 0; i < daysOfWeek.length; i++ ) {
                  if ( i >= _startDayNum - 1 && _studyWeekDays.indexOf(daysOfWeek[i]) !== -1 && _courseDurationInMs >  _firstWeekDaysCount * _msPerDay ) {
                     _firstWeekDaysCount++;
                     _firstWeekEndDay = i + 1;
                  }
               }

               _fullWeeksCount = parseInt((_courseDurationInMs - _firstWeekDaysCount * _msPerDay) / _msPerWeek);
               _overDays = (_courseDurationInMs - _firstWeekDaysCount * _msPerDay) % _msPerWeek;

               if ( _overDays > 0 ) {
                  _lastWeekTimeInMs = _courseDurationInMs - (_fullWeeksCount * _msPerWeek) - (_firstWeekDaysCount * _msPerDay);
                  _lastWeekDaysCount = _lastWeekTimeInMs > 0 ? Math.ceil(_lastWeekTimeInMs / _msPerDay) : 0;
                  _endDate = _firstWeekDaysCount * _msPerDay + moment(moment(_startDate).add(1, 'weeks').startOf('isoWeek')).add(_fullWeeksCount, 'weeks');
                  _endDate = moment(_endDate).isoWeekday(_lastWeekDaysCount);
               }
               else if ( _studyWeekDays.length > 0 && _firstWeekEndDay ) {
                  _endDate = moment(_startDate).add(_fullWeeksCount, 'weeks').isoWeekday(_firstWeekEndDay);
               }
               return _endDate;
            }

            function persistTeachersStatus (_userId, _classId, _teacherIds, _status, _comment) {
               var reqData = {
                  userId     : _userId,
                  classId    : _classId,
                  teacherIds : _teacherIds,
                  status     : _status,
                  comment    : _comment
               };
               return swAgentService.request('post', 'StudyClass', 'persistteachersstatus', reqData);
            }

            function searchTeachers (_classId, _filter, _itemsCount) {
               var reqData = {
                  classId    : _classId,
                  filter     : _filter,
                  itemsCount : _itemsCount
               };
               return swAgentService.request('get', 'StudyClass', 'searchTeachers', reqData);
            }
         }]
   });
});