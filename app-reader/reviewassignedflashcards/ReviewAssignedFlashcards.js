define([
   'angular',
   'module',
   'moment',
   'Context',
   'swComponentFactory',
   'underscore',
   'text!./ReviewAssignedFlashcards.html',
   'less!./ReviewAssignedFlashcards.less'
], function(angular, module, moment, Context, swComponentFactory, _, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine: true,
      controller: [
         '$scope',
         '$interval',
         'swStudyFlashcardsService',
         'swReviewAssignedFlashcardsComponentService',
         'swLongRunningOperation',
         function(
            $scope,
            $interval,
            swStudyFlashcardsService,
            swReviewAssignedFlashcardsComponentService,
            swLongRunningOperation) {

            $scope.flashCardsArr = [];
            $scope.creationDateInfo = {};
            $scope.progresArr = [];
            
            $scope.orderParams = {
               byTerm: 'question',          // from lowest to highest,
               byCreationTime: '-createdAt',  // "-" - means from highest to lowest
               byRunTime: '-nextRunAt',
               byNextRuntime: 'nextRuntimeInfo.diff'
            };

            var interval,
                calledFromApplyFilter,
                ITEMS_ON_PAGE = 20,
                DATE_FORMAT = Context.parameters.defaultDateFormat;

            $scope.correctAnswersCountOption = {
               popupCustomClass: 'answers',
               data: function () {
                  return $scope.progresArr;
               },
               i18n: {
                  placeholder: 'All'
               },
               format: function (item) {
                  return item.toString();
               },
               isClearAllowed: function() {
                  return true;
               }
            };

            $scope.swInit = function() {
               getFlashCardsList();

               swReviewAssignedFlashcardsComponentService.addOnFlashCardsCloseListener(onFlashCardsCloseListener);
            };

            $scope.getCreationInfo = function(item) {
               return formatDateInfo(item.createdAt);
            };

            $scope.getRuntimeInfo = function(item) {
               return formatDateInfo(item.nextRunAt);
            };

            $scope.resetSearch = function() {
               $scope.flashCardFilter.question = '';
               getFlashCardsList();
            };

            $scope.setOrderParam = function(order) {
               $scope.order = order;
            };

            $scope.swSubmachine.$on$end$enter = function () {
               swReviewAssignedFlashcardsComponentService.removeOnFlashCardsCloseListener(onFlashCardsCloseListener);
               cancelIntervalIfExists(interval);
            };

            $scope.applyFilter = function (filterCriteria) {
               calledFromApplyFilter = true;
               getFlashCardsList(filterCriteria.question, filterCriteria.correctAnswersCount);
            };

            function onFlashCardsCloseListener(promise) {
               promise.then(function(data){
                  if (data === 'Ok') {
                     getFlashCardsList();
                  }
               });
            }

            function getFlashCardsList(question, correctAnswersCount) {
               //debugger;//service client - tested
               swLongRunningOperation.suspend();
               swStudyFlashcardsService.searchAssignedFlashcards(ITEMS_ON_PAGE, question, correctAnswersCount)
                   .then(function (data) {
                      $scope.flashCardsArr = data;
                      if (!calledFromApplyFilter) {
                         $scope.progresArr = _.chain(data).pluck('correctAnswersCount').uniq().sortBy().value();
                      }
                      setIntervalUpdateNextRuntimeInfo();
                      updateNextRuntimeInfo($scope.flashCardsArr);
                   });
               swLongRunningOperation.resume();
            }

            function setIntervalUpdateNextRuntimeInfo() {
               cancelIntervalIfExists(interval);

               interval = $interval(function(){
                  updateNextRuntimeInfo($scope.flashCardsArr);
               }, 60000);
            }

            function cancelIntervalIfExists(promise){
               if (angular.isDefined(promise)) {
                  $interval.cancel(promise);
               }
            }

            function updateNextRuntimeInfo(flashCardsArr) {
               angular.forEach(flashCardsArr, function(value) {
                  value.nextRuntimeInfo = getNextRuntimeInfo(value);
               });
            }

            function getNextRuntimeInfo(item) {
               var now = moment(),
                  nextPlay = moment(item.nextRunAt),
                  nextPlayString = '',
                  diff = nextPlay.diff(now);

               if (diff <= 0) {
                  nextPlayString = 'Now';
               }
               else {
                  nextPlayString = nextPlay.fromNow();
               }

               return {
                  nextPlayString: nextPlayString,
                  diff: diff
               };
            }

            function formatDateInfo(param) {
               var date = new Date(param),
                   dateFormatted = moment(date).format(DATE_FORMAT),
                   currentDate = new Date(),
                   dateInfo = {};

               if ( dateFormatted !== moment(currentDate).format(DATE_FORMAT) )
               {
                  dateInfo.date = dateFormatted;
               }
               else
               {
                  dateInfo.time = moment(date).format('HH:mm');
               }
               return dateInfo;
            }
         }
      ]
   });
});