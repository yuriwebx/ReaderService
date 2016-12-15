define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./Exercises.html',
   'less!./Exercises'
], function (module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         extrasApi: '=',
         gotoLocator: '&'
      },
      controller: [
         '$scope',
         '$timeout',
         '$q',
         'swManageTestsService',
         'swReaderService',
         'swManageTestService',
         'swBookInfoService',
         'swApplicationToolbarService',
         'swFlashcardsAssessmentService',
         'swQuizzesAssessmentService',
         'swStudyFlashcardsService',
         'swMaterialsService',
         'swManageEssayTaskService',
         'swManageEssayTasksService',
         'swOpenPublicationService',
         'swContentProvider',
         'swUserStudyService',
         'swLongRunningOperation',
         'swDiscussionsService',
         'swContextPopupService',
         function ($scope, $timeout, $q, swManageTestsService, swReaderService, swManageTestService,
                   swBookInfoService, swApplicationToolbarService, swFlashcardsAssessmentService, swQuizzesAssessmentService,
                   swStudyFlashcardsService, swMaterialsService, swManageEssayTaskService,
                   swManageEssayTasksService, swOpenPublicationService,
                   swContentProvider, swUserStudyService, swLongRunningOperation, swDiscussionsService, swContextPopupService) {

            var publicationId,
                DEFAULT_PARAGRAPH_LENGTH = 1;

            function _cleanParagraphSummary() {
               $scope.paragraphSummary = {
                  words: '',
                  switcher: false
               };
            }

            var onParagraphSummaryChangeListener = function (materials) {
               $scope.paragraphSummary.words = materials;
               $scope.paragraphSummary.switcher = (materials > 0);
            };

            $scope.exercises = [];

            function getAllActiveExercises(_exercises) {
               _exercises.forEach(function(exercise) {
                  exercise.completed = exercise.status ? exercise.status === 'Completed' : exercise.completed;
               });
               $scope.exercises = swContentProvider.decorateExercises(_exercises);
            }

            $scope.swInit = function () {
               $scope.isEditor = swApplicationToolbarService.isEditor();
               _init();
               swContentProvider.onMicroJParaSizeChange = onParagraphSummaryChangeListener;
               swContentProvider.addOnExercisesChangeListener(getAllActiveExercises);
               swOpenPublicationService.addOpenPublicationListener(_init);
            };

            $scope.swDestroy = function () {
               swOpenPublicationService.removeOpenPublicationListener(_init);
               swContentProvider.removeOnExercisesChangeListener(getAllActiveExercises);
            };

            function _init() {
               _cleanParagraphSummary();
               var bookKey = swReaderService.getBookKey();
               var materials = swContentProvider.getMicroJParaSize();
               publicationId = bookKey._id;

               swBookInfoService.saveBookInfo(bookKey, {
                  extrasTab: 'Exercises'
               });
               if ((!$scope.paragraphSummary.switcher) && (materials > 0)) {
                  onParagraphSummaryChangeListener(materials);
               }
            }

            $scope.isFlashcards = function (exercise) {
               return ((exercise.type === 'Test') && (exercise.testType === 'Flashcard'));
            };

            $scope.isQuiz = function (exercise) {
               return ((exercise.type === 'Test') && (exercise.testType === 'Quiz'));
            };

            $scope.isEssayTask = function (exercise) {
               return exercise.type === 'EssayTask';
            };

            $scope.isDiscussionTask = function (exercise) {
               return exercise.type === 'discussion task';
            };

            $scope.paragraphSummarySwitch = function () {
               $scope.paragraphSummary.switcher = !$scope.paragraphSummary.switcher;
               if (!$scope.paragraphSummary.switcher) {
                  $scope.paragraphSummary.words = '';
                  swMaterialsService.updateMaterialsSet({paraSize: ''});
                  swContentProvider.setMicroJParaSize('');
               }
               else {
                  $scope.paragraphSummary.words = DEFAULT_PARAGRAPH_LENGTH;
                  $scope.paragraphSummaryPersist();
               }

            };

            $scope.paragraphSummaryPersist = function () {
               $timeout(function () {
                  if (!/^[1-9]\d*$/.test($scope.paragraphSummary.words)) {
                     $scope.paragraphSummary.words = DEFAULT_PARAGRAPH_LENGTH;
                  }

                  var length = parseInt($scope.paragraphSummary.words, 10);

                  if ($scope.paragraphSummary.switcher && (length > 0)) {
                     swLongRunningOperation.resume();
                     swMaterialsService.updateMaterialsSet({paraSize: length});
                     swLongRunningOperation.suspend();

                     swContentProvider.setMicroJParaSize(length);
                  }
               });
            };

            $scope.showExerciseEditor = function (exercise) {
               var exerciseId = exercise._id;
               var promise = $q.when();
               var locator = _.has(exercise.locator, 'paragraphId') ? exercise.locator.paragraphId : exercise.locator; //paragraphId in essay task
               $scope.gotoLocator({
                  locator: '#' + locator
               });
               if ($scope.isEditor) {
                  if (exercise.testType) {
                     promise = swManageTestsService.getTest(exerciseId)
                        .then(function (data) {
                           return swManageTestService.showTestEditor(data, publicationId);
                        });
                  }
                  else if (exercise.type === 'discussion task') {
                     //Discussion task is an angular directive and does not need nota callback
                     swDiscussionsService.showDiscussionPopup(exercise, 'Edit');
                  }
                  else {
                     promise = swManageEssayTasksService.getEssayTask(exerciseId)
                        .then(function (data) {
                           return swManageEssayTaskService.showEssayEditor(data.locator.paragraphId, publicationId, data);
                        });
                  }
                  promise
                     .then(function (popup) {
                        return popup && popup.promise;
                     })
                     .then(function (material) {
                        if (material) {
                           swContextPopupService.updateExercise(material);
                        }
                     })
                     .catch(function (err) {
                        $scope.logger.debug(err);
                     });
               }
               else {
                  if (exercise.type === 'EssayTask') {
                     swOpenPublicationService.openPublication(publicationId,
                        "#" + exercise.locator.paragraphId); // TODO: design and use proper locator for Essay
                  }
                  else {
                     switch (exercise.testType) {
                        case 'Flashcard':
                           if (exercise.active) {
                              return false;
                           }
                           else {
                              swStudyFlashcardsService.activateTestQuestionsStudies(exerciseId, publicationId)
                                 .then(function (flashcardStudyIds) {
                                    var params = {
                                       id                  : exercise._id,
                                       active              : true,
                                       testType            : exercise.testType
                                    };
                                    exercise.active = true;
                                    swContextPopupService.updateExercise(exercise);
                                    swUserStudyService.persistFlashCard(params);
                                    swFlashcardsAssessmentService.startAssessment(flashcardStudyIds);
                                 })
                                 .catch(function () {
                                    $scope.logger.error('Tests Export Failed');
                                 });
                           }

                           break;

                        case 'Quiz':
                           swQuizzesAssessmentService.startAssessment(exerciseId, publicationId)
                              .then(function (data) {
                                 swUserStudyService.persistTest(data);
                              })
                              .catch(function () {
                                 $scope.logger.error('Tests Export Failed');
                              });

                           break;
                     }
                  }

               }
            };
         }
      ]
   });
});