define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./StudentsProgress.html',
   'less!./StudentsProgress.less'
], function (module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope : {
         classId   : '=',
         isTeacher : '='
      },
      submachine : true,
      controller : [
         '$scope',
         'swManagePersonalMessagesService',
         'swUserStudyService',
         'swUserService',
         function ($scope, swManagePersonalMessagesService, swUserStudyService, swUserService) {
            var vm = $scope;

            var numberOfUsers = 20,
                middleParams = {};

            vm.studyProgresses       = [];
            vm.wordsProgressModels   = [];
            vm.timeProgressModels    = [];
            vm.overallProgressModels = [];
            vm.editProgressFieldsArr = _.range(3);

            vm.swInit = swInit;
            vm.sendMessage = sendMessage;
            vm.showEditProgress = showEditProgress;
            vm.calculateProgress = calculateProgress;
            vm.calculateWordsProgress = calculateWordsProgress;
            vm.saveProgress = saveProgress;

            function swInit()
            {
               var classId = vm.classId,
                   filter = '',
                   category = '',
                   interval = 3;
               swUserStudyService.searchUserStudy(classId, filter, category, interval, numberOfUsers).then(function(result){
                  $scope.studyProgresses = _.map(result.data.usersProgress, function (item) {
                     item.isUserPhoto = !!item.photo;
                     if ( item.isUserPhoto ) {
                        item.userPhotoLink = swUserService.getUserPhoto(item.photo.fileHash);
                     }
                     return item;
                  });
                  if(!_.isEmpty(result.data.middleParams)) {
                     middleParams = result.data.middleParams;
                  }
                  prepareModelForCharts();
               });
            }

            function getMiddleHeight(middleValue, max){
               max = max + 1 === max ? 0 : max;
               middleValue = Math.round(100 * middleValue / max);
               middleValue = middleValue > 100 ? 100 : middleValue;
               return middleValue;
            }

            function prepareModelForCharts()
            {
               vm.wordsProgressModels = [];
               vm.timeProgressModels = [];
               vm.overallProgressModels = [];

               _.each(vm.studyProgresses, function(p)
               {
                  var wordsMin =   _.min(getFlattenValues(p,  'readingWordNumber'));
                  var wordsMax =   _.max(getFlattenValues(p,  'readingWordNumber'));
                  var timeMin =    _.min(getFlattenValues(p,  'readingDuration'));
                  var timeMax =    _.max(getFlattenValues(p,  'readingDuration'));
                  var overallMin = _.min(getFlattenValues(p,  'totalReadingDuration'));
                  var overallMax = _.max(getFlattenValues(p,  'totalReadingDuration'));
                  var correctionCoeficient = 0.1;
                  var wordMiddle    = getMiddleHeight(middleParams.readingWord, wordsMax);
                  var readingMiddle = getMiddleHeight(middleParams.readingDuration, timeMax);

                  wordMiddle = wordsMax <= middleParams.readingWord ? wordMiddle + wordMiddle * correctionCoeficient : wordMiddle - wordMiddle * correctionCoeficient;
                  readingMiddle = timeMax <= middleParams.readingDuration ? readingMiddle : readingMiddle - readingMiddle * correctionCoeficient;
                  
                  wordsMax = wordMiddle === 100 ?  wordsMax + wordsMax * correctionCoeficient : wordsMax;
                  timeMax = readingMiddle === 100 ?  timeMax + timeMax * correctionCoeficient : timeMax;
                  vm.wordsProgressModels.push({
                        values: _.map(p.progress, function(p){return p.readingWordNumber;}),
                        min   : wordsMin * correctionCoeficient,
                        max   : wordsMax,
                        type  : 'words',
                        middleHeight : wordMiddle
                       /* isCritical: true*/
                     }
                  );
                  vm.timeProgressModels.push({
                        values: _.map(p.progress, function(p){return p.readingDuration;}),
                        min   : timeMin * correctionCoeficient,
                        max   : timeMax,
                        type  : 'milliseconds',
                        middleHeight : readingMiddle
                     }
                  );

                  var totalReadingDuration = _.map(p.progress, _.property('totalReadingDuration'));
                  var maxTotalReadingDuration = Math.max.apply(this, totalReadingDuration); 
                  vm.overallProgressModels.push({
                        values: totalReadingDuration,
                        min   : overallMin * correctionCoeficient,
                        max   : overallMax,
                        type  : 'milliseconds',
                        middleHeight : 0,
                        isCritical: maxTotalReadingDuration < (middleParams.expectedTotalReadingTime * 0.9)
                     }
                  );
               });
               
            }
            
            function getFlattenValues(array, valueName)
            {
               return _.map(array.progress, function(b){
                  return b[valueName];
               });
            }
            
            function sendMessage(student)
            {
               swManagePersonalMessagesService.sendMessage([student], vm.classId);
            }
            //TODO: temprary function
            var isEditProgress = false;
            function showEditProgress() { // variable for #editProgressForm
               return isEditProgress;
            }

            function calculateProgress(userIndex, progressIndex) {
               getProgressValue(userIndex, progressIndex, 'readingDuration', vm.timeProgressModels);
               var totalProgress = 0;
               _.each(vm.studyProgresses[userIndex].progress, function(p) {
                  totalProgress += p.readingDuration;
                  p.totalReadingDuration = totalProgress;
               });
               prepareModelForCharts();
            }

            function calculateWordsProgress(userIndex, progressIndex) {
               getProgressValue(userIndex, progressIndex, 'readingWordNumber', vm.wordsProgressModels);
               prepareModelForCharts();
            }

            function saveProgress() {
               swUserStudyService.setUserStudyProgressClass(vm.classId, vm.studyProgresses);
            }

            $scope.isCurrentUser = function (userId) {
               return userId === swUserService.getUserId();
            };

            function getProgressValue (userIndex, progressIndex, param, model) {
               var value = parseInt(model[userIndex].values[progressIndex], 10);
               vm.studyProgresses[userIndex].progress[progressIndex][param] = isNaN(value) ? 0 : value;
            }
         }]
   });
});