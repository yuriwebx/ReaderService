define([
   'module',
   'underscore',
   'swServiceFactory'
], function(module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
      'swUserStudyService',
      'swContentProvider',
      '$q',
      function(swUserStudyService, swContentProvider, $q) {

         var studyItems       = [];
         var currentItem      = {};
         var currentItemIndex = -1;
         var startTimeCountDuration = 0;
         var currentProgress = {
            bookId: '',
            readingProgress: 0,
            readingWordNumber: 0,
            readingDuration: 0,
            readingPosition: {
               fragmentId: ''
            }
         };

         function ReaderData (publicationId, classId) {
            this.publicationId = publicationId || '';
            this.classId = classId || '';
            this.mode = classId ? 'Class' : 'Publication';
            this.type = classId ? 'StudyClass' : 'publication';
         }

         var readerData = new ReaderData();

         this.setReaderData = function(params) {
            var classId = params.classId || params._classId;
            var publicationId = params._studyCourseId || params._id;

            readerData = new ReaderData(publicationId, classId);
            return readerData;
         };

         this.getReaderData = function() {
            return readerData;
         };

         this.getCurrentItemIndex = function() {
            return currentItemIndex;
         };

         this.getStudyItems = function() {
            return studyItems;
         };

         this.getCurrentStudyItem = function() {
            return currentItem;
         };

         this.setCurrentItems = function(userStudy) {
            startTimeCountDuration = _.now() - userStudy.readingDuration;
            studyItems  = userStudy.studyItems;
            return this.switchItem(userStudy.currentStudyItemId);
         };

         this.getOpenParams = function() {
            var readRange = null;
            var id = 0;
            if (currentItem.paragraphId) {
               readRange = [currentItem.paragraphId, currentItem.paragraphId];
               if (currentItem.finishingParagraphId) {
                  readRange[1] = currentItem.finishingParagraphId;
               }
            }
            if (currentItem.studyGuideId) {
               id = currentItem.studyGuideId;
            }
            else {
               id = currentItem.bookId || currentItem.id;
            }
            var openParams = {
               id : id,
               readRange : readRange,
               studyItemId : currentItem.id,
               readingPosition : currentItem.readingPosition
            };
            return openParams;
         };

         this.hasNextItem = function() {
            return studyItems.slice(currentItemIndex + 1).some(function(item) {
               return !_isSectionItem(item);
            });
         };

         this.switchItem = function(id) {
            var vocabularyAssessments = [];
            var findFirstValid = !id;
            var currentStudyItemId = currentItem.id;

            if (!findFirstValid) {
               currentItem = _.find(studyItems, function (item, index) {
                  currentItemIndex = index;
                  return item.id === id;
               });
               if (!currentItem || _isVocabularyAssessmentItem(currentItem)) {
                  findFirstValid = true;
                  currentItemIndex = -1;
               }
            }
            if (findFirstValid) {
               currentItem = _.find(studyItems, function(item, index) {
                  if (index <= currentItemIndex) { //skip prev
                     return false;
                  }
                  if (_isVocabularyAssessmentItem(item)) {
                     vocabularyAssessments.push(item.id);
                  }
                  else if (!_isSectionItem(item)) {
                     currentItemIndex = index;
                     return true;
                  }
               });
            }
            if (!currentItem && currentItemIndex > -1) { //in case of assessements in the end
               currentItem = studyItems[currentItemIndex];
            }
            if (currentStudyItemId && currentStudyItemId !== id) { // dstr is missing =(
               this.persistUserStudyProgress(0, findFirstValid);
            }
            return $q.when(_.extend(this.getOpenParams(), {
               vocabularyAssessments : vocabularyAssessments
            }));
         };

         this.updateCurrentProgress = function(bookmark, progress, bookId) {
            progress = +progress || 0;
            var totalWordsCount = swContentProvider.getDetails().wordsNumber;
            var readingProgress = 0 ;

            if (progress >= 0) {
               readingProgress = Math.ceil((progress / totalWordsCount) * 100);
               currentProgress.readingWordNumber = progress;
               currentProgress.readingProgress = readingProgress;
            }
            currentProgress.bookId = bookId;
            currentProgress.readingDuration = getCurrentReadingDuration();
            _.extend(currentProgress.readingPosition, bookmark);

            currentItem.readingPosition = currentItem.readingPosition || {};
            _.extend(currentItem.readingPosition, bookmark);
            updateLocalProgress(currentProgress.readingProgress, currentItem.id);
            this.persistUserStudyProgress(0, false, true);
         };

         this.getCurrentReadingDuration = getCurrentReadingDuration;

         this.persistUserStudyProgress = function(readingDuration, isFinished, silentMode) {
            var persistParams = {
               publicationId        : readerData.publicationId,
               recordedAt           : _.now(),
               currentStudyItemId   : currentItem.id,
               readingDuration      : readingDuration,
               classId              : readerData.classId,
               type                 : readerData.type
            };
            _.extend(persistParams, currentProgress);
            persistParams.readingProgress = isFinished ? 100 : +persistParams.readingProgress;
            persistParams.completed = persistParams.readingProgress > 90;

            return swUserStudyService.persistUserStudyProgress(persistParams, silentMode);
         };

         function getCurrentReadingDuration() {
            return _.now() - startTimeCountDuration;
         }

         function updateLocalProgress(readingProgress, studyItemId) {
            var currentstudyItem = _.findWhere(studyItems, {id : studyItemId}) || {};
            currentstudyItem.readingProgress = Math.max(0, currentstudyItem.readingProgress || 0, readingProgress);
         }

         function _isSectionItem(item) {
            return item.type === 'section item';
         }

         function _isVocabularyAssessmentItem (item) {
            return item.type === 'vocabulary assessment item';
         }

      }]
   });
});