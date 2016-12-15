define([
   'module',
   'moment',
   'Context',
   'underscore',
   'swComponentFactory',
   'text!./Parametres.html',
   'less!./Parametres.less'
], function (module, moment, Context, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         studyProject: '=',
         wizardApi: '='
      },
      controller: [
         '$scope',
         'swI18nService',
         'swStudyClassService',
         function ( $scope, swI18nService, swStudyClassService ) {
            var vm                 = $scope;
            var OUTPUT_DATE_FORMAT = Context.parameters.defaultDateFormat;
            var INPUT_DATE_FORMAT  = Context.parameters.inputDateFormat;
            var durationsConfig    = Context.parameters.studyProjectConfig.studyClassDurations;
            var durations          = [];
            var min                = durationsConfig.min;

            while (min <= durationsConfig.max) {
               var duration =  min + ' hours';
               if (min === 0.5 || min === 1) {
                  duration = min + ' hour';
               }
               durations.push(duration);
               min += durationsConfig.step;
            }

            vm.daysOfWeek = _.map(Context.parameters.daysOfWeek,
               function (day) {
                  return swI18nService.getResource(day);
               });

            vm.activeButtons                         = {};
            vm.studyProject.durations                = durations;
            vm.wizardApi.isCoursePeriodBlockDisabled = !!vm.wizardApi.isCoursePeriodBlockDisabled;

            vm.swInit                  = _init;
            vm.changeCourseDates       = changeCourseDates;
            vm.setStudyWeekDays        = setStudyWeekDays;
            vm.toggleCoursePeriodBlock = toggleCoursePeriodBlock;

            function _init () {
               if ( vm.studyProject.studyWeekDays && vm.studyProject.studyWeekDays.length < 7 ) {
                  setCourseStudyDays(vm.studyProject.studyWeekDays, changeCourseDates);
               }
               else {
                  _setCourseDates(vm.wizardApi.isCoursePeriodBlockDisabled, setStudyWeekDays);
               }

               vm.isSelfStudy = vm.studyProject && vm.studyProject.type === 'Independent Study';
               vm.wizardApi.getProgress();
            }

            function setCourseStudyDays (_studyDays, callbackFn) {
               _.each(_studyDays, function (_d) {
                  var i = _.indexOf(vm.daysOfWeek, _d);
                  vm.activeButtons[i] = true;
               });
               _executeCallbackFn(callbackFn);
            }

            function getExpectedDailyReadingTime () {
               return parseFloat(vm.studyProject.expectedDailyWork) * 3600 * 1000;
            }

            vm.durationsOptions = {
               popupCustomClass: 'durations',
               data: function () {
                  return vm.studyProject.durations;
               },
               format: function (duration) {
                  return duration;
               }
            };

            function changeCourseDates () {
               if ( !vm.studyProject.publication ) {
                  vm.wizardApi.debValid();
                  return false;
               }

               var allReadingTimeInMs   = vm.studyProject.publication.readingTime,
                   dailyReadingTimeInMs = getExpectedDailyReadingTime(),
                   classScheduledAt     = new Date(vm.studyProject.classScheduledAt).getTime();
               vm.studyProject.endCourse = _getEndCourseDate(classScheduledAt, dailyReadingTimeInMs, vm.studyProject.studyWeekDays, allReadingTimeInMs);
               var readingTime = vm.studyProject.publication.readingTime / 3600 / 1000;
               var expectedDailyWork = parseFloat(vm.studyProject.expectedDailyWork);
               var parameters = {
                  estimatedTime: Math.max((readingTime / expectedDailyWork).toFixed(), 1)
               };
               vm.courseTimeRequired = swI18nService.getResource('CreateStudyProject.courseTimeRequired.label', parameters);
               vm.wizardApi.debValid();
            }

            function setStudyWeekDays (_weekDay, _i) {
               if ( !_weekDay ) {
                  _selectAllStudyWeekDays(changeCourseDates);
                  return;
               }
               _setStudyWeekDays(_weekDay, _i, changeCourseDates);
            }

            function toggleCoursePeriodBlock () {
               vm.wizardApi.isCoursePeriodBlockDisabled = !vm.wizardApi.isCoursePeriodBlockDisabled;
               _setCourseDates(vm.wizardApi.isCoursePeriodBlockDisabled, setStudyWeekDays);
               vm.wizardApi.debValid();
            }

            function _setCourseDates (_isTermless, _setStudyWeekDaysFn) {
               if ( _isTermless ) {
                  vm.studyProject.studyWeekDays = vm.daysOfWeek;
                  delete vm.studyProject.classScheduledAt;
                  delete vm.studyProject.expectedDailyWork;
                  return;
               }

               if ( _isTermless || vm.studyProject.type === 'Independent Study' ) {
                  delete vm.studyProject.joinEndDate;
               }

               _.extend(vm.studyProject, {
                  studyWeekDays     : [],
                  classScheduledAt  : moment(vm.studyProject.classScheduledAt || Date.now()).format(INPUT_DATE_FORMAT),
                  expectedDailyWork : vm.studyProject.expectedDailyWork || vm.wizardApi.getObjectsItemValue(vm.studyProject.durations, 0)
               });

               if ( !vm.isSelfStudy ) {
                  vm.studyProject.joinEndDate = moment(vm.studyProject.joinEndDate || Date.now()).format(INPUT_DATE_FORMAT);
               }
               _executeCallbackFn(_setStudyWeekDaysFn);
            }

            // Helpers:
            function _setStudyWeekDays (_weekDay, _i, _callbackFn) {
               var isNotActive = _.indexOf(vm.studyProject.studyWeekDays, _weekDay) === -1;
               if ( isNotActive ) {
                  vm.studyProject.studyWeekDays.push(_weekDay);
               }
               else {
                  vm.studyProject.studyWeekDays = _.without(vm.studyProject.studyWeekDays, _weekDay);
               }
               vm.activeButtons[_i] = isNotActive;
               _executeCallbackFn(_callbackFn);
            }

            function _selectAllStudyWeekDays (_callbackFn) {
               vm.studyProject.studyWeekDays = vm.daysOfWeek;
               for ( var i = 0; i <= vm.studyProject.studyWeekDays.length; i++ ) {
                  vm.activeButtons[i] = true;
               }
               _executeCallbackFn(_callbackFn);
            }

            function _getEndCourseDate (_startDate, _dailyTimeInMs, _daysPerWeek, _courseTime) {
               return swStudyClassService.countEndCourseDate({
                  startDate      : _startDate,
                  studyWeekDays  : _daysPerWeek,
                  timeInMsPerDay : _dailyTimeInMs,
                  allReadingTime : _courseTime
               }).format(OUTPUT_DATE_FORMAT);
            }

            function _executeCallbackFn (_callback) {
               if ( typeof _callback === 'function' ) {
                  _callback();
               }
            }
         }]
   });
});