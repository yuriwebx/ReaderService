define([
   'module',
   'underscore',
   'ngModule',
   'swLoggerFactory',
   'moment',
   'text!./DateInputPopupHeader.html',
   'text!./DateInputPopupContent.html',
   'text!./DateInputPopupFooter.html',
   'text!./DateInput.html',
   'less!./DateInput',
   'maskedinput'
   ],
   function(module, _, ngModule, swLoggerFactory, moment, templatePopupHeader, templatePopupContent, templatePopupFooter, dateInputTemplate)
   {
      'use strict';
      
      var logger = swLoggerFactory.getLogger(module.id);
      logger.trace('create');
   
      ngModule.directive('swDateInput',
            [ 'swPopupService', 'swDateService', 'swI18nService',
      function(swPopupService,   swDateService,   swI18nService )
      {
         logger.trace('register');
         
         return {
            restrict: 'E',
            template: dateInputTemplate,
            replace: true,
            require: 'ngModel',
            scope: true,
            link: function(scope, element, attr, ctrl)
            {
               /*jshint unused:true */
               
               // Please note that we rely on directive that applied
               // here via "sw-input-date" class (see DateTime.js).
               
               scope.dateFieldRaw = '';
               
               var wrapper = element.data('sw-input-wrapper'); // see Input.js

               var dateMask = swI18nService.getDateMask();
               var dateInputMask = dateMask.replace(/[DMY]/gi,'9');
               var placeholder = dateInputMask.replace(/9/g,'_');
               
               var dateInput = element.find('.sw-dateInput-input');
               dateInput.mask(dateInputMask, {autoclear: false});
               dateInput.attr('placeholder', placeholder);

               var disabled;

               attr.$observe('disabled', function(value)
               {
                  // disabled="{{expr}}" - value is string
                  // ng-disabled="expr"  - value is boolean
                  if ( _.isString(value) )
                  {
                     value = value.toLowerCase() === 'true';
                  }
                  
                  disabled = !!value;
                  wrapper.toggleClass('disabled', disabled);
                  dateInput.prop('disabled', disabled);
               });
               
               scope.dateEntered = function()
               {
                  ctrl.$setViewValue(
                        scope.dateFieldRaw === placeholder ? '' : scope.dateFieldRaw);
               };
               
               ctrl.$render = function()
               {
                  scope.dateFieldRaw = ctrl.$viewValue || placeholder;
               };
               
               var calendarPopup = null;
               
               scope.openCalendar = function($event)
               {
                  if ( !disabled )
                  {
                     var offset = $event.target;
                     initCalendar();
                     calendarPopup = swPopupService.show({
                        scope: scope,
                        customClass: 'sw-dateInput-popup',
                        header: templatePopupHeader,
                        content: templatePopupContent,
                        footer: templatePopupFooter,
                        layout: {
                           offset: offset,
                           arrow: true,
                           my: 'LT',
                           at: 'LB'
                        }
                     });
                  }
               };
               
               scope.setDate = function(dayNo, weekNo)
               {
                  var date = createDate(dayNo, weekNo);
                  scope.dateFieldRaw = swDateService.formatDate(date, dateMask);
                  ctrl.$setViewValue(scope.dateFieldRaw);
                  calendarPopup.hide();
               };
               scope.setCurrentDate = function()
               {
                  var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
                  scope.dateFieldRaw = swDateService.formatDate(now, dateMask);
                  ctrl.$setViewValue(scope.dateFieldRaw);
                  calendarPopup.hide();
               };
               
               scope.yearsBack = function()
               {
                  scope.yearStart -= 20;
                  scope.yearEnd -= 20;
                  initYearsRange();
               };
               
               scope.yearsForward = function()
               {
                  scope.yearStart += 20;
                  scope.yearEnd += 20;
                  initYearsRange();
               };
               
               scope.initYearsPicker = function()
               {
                  scope.yearsPicker = true;
                  scope.yearEnd = scope.year + 4;
                  for(var i = 0; i <= 10; i++)
                  {
                     if(scope.yearEnd % 10 === 0)
                     {
                        break;
                     }
                     scope.yearEnd += 1;
                  }
                  scope.yearStart = scope.yearEnd - 20;
                  initYearsRange();
               };
               
               function initYearsRange()
               {
                  scope.yearsRange = [];
                  for(var l = 0; l < 3; l++)
                  {
                     var yearsLine = [];
                     for(var k = 0; k < 7; k++)
                     {
                        yearsLine.push(scope.yearStart + (l * 7 + k));
                     }
                     scope.yearsRange.push(yearsLine);
                  }
               }
               
               scope.monthBack = function()
               {
                  scope.monthNo -= 1;
                  if(scope.monthNo < 0)
                  {
                     scope.monthNo = 11;
                     scope.year -= 1;
                  }
                  initMonth();
               };
               
               scope.changeMonth = function(monthNo)
               {
                  scope.monthNo = monthNo;
                  initMonth();
               };
               
               scope.changeYear = function(year)
               {
                  scope.year = year;
                  initMonth();
                  scope.yearsPicker = false;
               };
               
               scope.monthForward = function()
               {
                  scope.monthNo += 1;
                  if(scope.monthNo > 11)
                  {
                     scope.monthNo = 0;
                     scope.year += 1;
                  }
                  initMonth();
               };
               
               function createDate(dayNo, weekNo)
               {
                  var monthNo = scope.monthNo + 1;
                  if(weekNo === 0 && dayNo > 20)
                  {
                     monthNo = monthNo === 1 ? 12 : monthNo - 1;
                  }
                  if(weekNo > 3 && dayNo < 15)
                  {
                     monthNo = monthNo === 12 ? 1 : monthNo + 1;
                  }
                  var year = scope.year;
                  if(scope.monthNo === 0 && monthNo === 12)
                  {
                     year -= 1;
                  }
                  if(scope.monthNo === 11 && monthNo === 1)
                  {
                     year += 1;
                  }
                  return moment(year + '-' + monthNo  + '-' + dayNo, 'YYYY-MM-DD');
               }
               
               function initCalendar()
               {
                  var dateParsed = moment(scope.dateFieldRaw, dateMask, true);
                  scope.year = !dateParsed.isValid() ? moment().get('year') : dateParsed.get('year');
                  scope.monthNo = !dateParsed.isValid() ? moment().get('month') : dateParsed.get('month');
                  scope.firstDayOfWeek = moment.localeData()._week.dow;
                  scope.weekdayTitles = [];
                  for(var i = 0; i <= 6; i++)
                  {
                     var daysShift = scope.firstDayOfWeek + i;
                     var index = daysShift > 6 ? daysShift - 7 : daysShift;
                     scope.weekdayTitles.push(moment.weekdaysMin(index));
                  }
                  scope.firstHalfYear = [];
                  for(i = 0; i < 6; i++)
                  {
                     scope.firstHalfYear.push({monthName: moment.monthsShort(i), monthNo: i});
                  }
                  scope.secondHalfYear = [];
                  for(i = 6; i < 12; i++)
                  {
                     scope.secondHalfYear.push({monthName: moment.monthsShort(i), monthNo: i});
                  }
                  initMonth();
               }
               
               function initMonth()
               {
                  scope.month = moment.months(scope.monthNo);
                  scope.daysOfMonth = [];
                  var startOfMonth = moment(scope.year + '-' + (scope.monthNo + 1) + '-01', 'YYYY-MM-DD');
                  var currentWeek = [];
                  var currentDayOfWeek = startOfMonth.day();
                  var daysShift = 0;
                  if(currentDayOfWeek === scope.firstDayOfWeek)
                  {
                     for(daysShift = 1; daysShift <= 7; daysShift++)
                     {
                        currentWeek.unshift(moment(startOfMonth).subtract(daysShift, 'days').date());
                     }
                     daysShift = 0;
                  }
                  else
                  {
                     while(currentDayOfWeek !== scope.firstDayOfWeek)
                     {
                        daysShift += 1;
                        currentWeek.unshift(moment(startOfMonth).subtract(daysShift, 'days').date());
                        currentDayOfWeek = (currentDayOfWeek - 1) >= 0 ?
                              (currentDayOfWeek - 1) : (currentDayOfWeek + 6 );
                     }
                     currentDayOfWeek = startOfMonth.day();
                     daysShift = 0;
                     while(currentDayOfWeek !== scope.firstDayOfWeek)
                     {
                        currentWeek.push(moment(startOfMonth).add(daysShift, 'days').date());
                        daysShift += 1;
                        currentDayOfWeek = (currentDayOfWeek + 1) > 6 ?
                              (currentDayOfWeek - 6) : (currentDayOfWeek + 1);
                     }
                  }
                  
                  scope.daysOfMonth.push(currentWeek);
                  
                  while(scope.daysOfMonth.length < 6)
                  {
                     currentWeek = [];
                     for(var i = 1; i <= 7; i++)
                     {
                        currentWeek.push(moment(startOfMonth).add(daysShift, 'days').date());
                        daysShift += 1;
                     }
                     scope.daysOfMonth.push(currentWeek);
                  }
               }
               
               scope.isAdjacentMonth = function(dayNo, weekNo)
               {
                  return scope.monthNo !== createDate(dayNo, weekNo).get('month');
               };
               
               scope.isCurrentDate = function(dayNo, weekNo)
               {
                  var now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
                  return now.isSame(createDate(dayNo, weekNo));
               };
               
               scope.isSelectedDate = function(dayNo, weekNo)
               {
                  var date = moment(scope.dateFieldRaw, dateMask).hours(0).minutes(0).seconds(0).milliseconds(0);
                  return date.isSame(createDate(dayNo, weekNo));
               };

               scope.increment = function(delta)
               {
                  if ( !disabled )
                  {
                     logger.trace(delta);
                  }
               };
               
            }
         };
      }]);
   }
);
