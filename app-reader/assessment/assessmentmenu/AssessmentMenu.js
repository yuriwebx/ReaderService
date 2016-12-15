define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./AssessmentMenu.html',
   'less!./AssessmentMenu.less'
], function(module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         data: '='
      },
      controller: [
         '$q',
         '$scope',
         'swStudyFlashcardsService',
         'swFlashcardsAssessmentService',
         'swVocabularyService',
         'swDirectVocabularyService',
         'swI18nService',
         'swVocabularyAssessmentService',
         'swOpenPublicationService',
         'swStudyClassService',
         'swManageClassDiscussionsService',
         function(
            $q,
            $scope,
            swStudyFlashcardsService,
            swFlashcardsAssessmentService,
            swVocabularyService,
            swDirectVocabularyService,
            swI18nService,
            swVocabularyAssessmentService,
            swOpenPublicationService,
            swStudyClassService,
            swManageClassDiscussionsService) {

            var vm = $scope;
            var flashcardLabel = swI18nService.getResource('AssessmentMenu.Flashcard.label');
            var vocabularyLabel = swI18nService.getResource('AssessmentPlayer.VocabularyAssessment.label');
            var flashcardIds;

            vm.data = vm.data || [];

            vm.startAssessment = startAssessment;
            vm.swInit          = _init;
            vm.goToDiscussion  = goToDiscussion;

            function startAssessment (assessmentType) {
               var services = {};
               services[flashcardLabel] = function(){
                  swFlashcardsAssessmentService.startAssessment(flashcardIds);
               };
               services[vocabularyLabel] = function(){
                  var settings = {wait : true};
                  swVocabularyAssessmentService.startAssessment(swDirectVocabularyService, settings);
               };
               services[assessmentType]();
            }

            function _init () {
               var discussionIds = getUnreadDiscussionIds();
               swManageClassDiscussionsService.updateUserDiscussionMessagesState(discussionIds, false, true);

               $q.all([
                  swStudyFlashcardsService.searchFlashcardStudies(),
                  swVocabularyService.getResult()
               ]).then(function(response) {
                  var vocabularyTermsCount = response[1].data.vocabularyTermsCount || 0;
                  flashcardIds = response[0];
                  vm.assesments = [{
                     name: flashcardLabel,
                     value: response[0].length
                  }, {
                     name: vocabularyLabel,
                     value: vocabularyTermsCount
                  }];
               }, function() {
                  $scope.assesments = [{
                     name: flashcardLabel,
                     value: 0
                  }, {
                     name: vocabularyLabel,
                     value: 0
                  }];
               });
            }

            function goToDiscussion (_discussion) {
               if ( !_discussion.bookId ) {
                  return;
               }
               openStudyClass(_discussion);
            }

            /*   Helpers   */
            function openStudyClass (_discussion) {
               swStudyClassService.getStudyClassInfo(_discussion.classId).then(_openStudyClass);

               function _openStudyClass (response) {
                  var studyClass = response.data;
                  var _path = _discussion.locator ? '#' + _discussion.locator : undefined;
                  swOpenPublicationService.beginUserStudy(_discussion.bookId, _path, {
                     isStudyCourse  : studyClass.studyCourseInfo.course.type === 'StudyCourse',
                     _studyCourseId : studyClass.studyCourseInfo.course._id,
                     _classId       : _discussion.classId,
                     type           : 'StudyClass',
                     isTeacher      : _discussion.userRole !== 'Student'
                  });
               }
            }

            function getUnreadDiscussionIds () {
               return _.map(getNotInformed(vm.data.discussions), '_id');

               function getNotInformed (_discussions) {
                  return _.filter(_discussions, {'informed': false});
               }
            }
         }
      ]
   });
});