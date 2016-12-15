define([
   'module',
   'underscore',
   'swComponentFactory',
   'text!./ManageTest.html',
   'less!./ManageTest'
], function (module, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope:
      {
        headerfn   : '=',
        popupsettings  : '='
      },
      controller: [
         '$scope',
         '$window',
         'swManageTestService',
         'swManageTestsService',
         'swValidationService',
         'swUtil',
         'swI18nService',
         function ($scope, $window, swManageTestService, swManageTestsService, swValidationService, swUtil, swI18nService)
         {
            var MAX_IMG_SIZE = 5 * 100 * 1000, //max allowed for uploading Image Size
                MAX_AUDIO_SIZE = 5 * 1000 * 1000; ///max allowed for uploading Audio Size

            $scope.tests            = [];
            $scope.incorrectAnswers = [];

            $scope.testData     = {};
            $scope.testQuestion = {};
            $scope.testsFound   = {};

            $scope.popupsettings.isTestImport        = false;
            $scope.popupsettings.isOtherSourceImport = false;
            $scope.isQuizletImport     = false;
            $scope.isLoading           = false;
            $scope.isImageEmpty        = true;

            $scope.incorrectAnswersLength = 3;

            $scope.getTestIcon = getTestIcon;

            $scope.swInit = function ()
            {
               $scope.testData = JSON.parse(JSON.stringify(swManageTestService.getTestInData()));
               $scope.testData.publicationId = swManageTestService.getPublicationId();
               $scope.popupsettings.name = $scope.testData.testType === 'Flashcard' ?
                                           swI18nService.getResource('ManageTest.Flashcard.Label') :
                                           swI18nService.getResource('ManageTest.Quiz.Label');
               $scope.currentTestQuestionIndex = 0;
               $scope.numberTest = $scope.tests.length;
               if ($scope.testData.name)
               {
                  $scope.tests           = $scope.testData.testQuestions;
                  $scope.testQuestion    = $scope.tests[$scope.currentTestQuestionIndex];
                  $scope.isAudioUploaded = $scope.testQuestion.audio ? true : false;
                  $scope.isImageUploaded = $scope.testQuestion.image ? true : false;
                  showImgPreview();
                  $scope.numberTest = $scope.tests.length - 1;
               }
            };

            $scope.getIncorrectAnswersLength = function (num)
            {
               return new Array(num);
            };

            $scope.openTestImport = function ()
            {
               $scope.popupsettings.isTestImport = true;
               $scope.popupsettings.testSearchCriteria = '';
            };

            $scope.headerfn.searchTests = function ()
            {
               if ($scope.popupsettings.testSearchCriteria)
               {
                  //debugger;//service client - NOT TESTED
                  swManageTestsService.searchTests($scope.popupsettings.testSearchCriteria)
                      .then(function onSearchTests(data) {
                         $scope.testsFound = data.data;
                         $scope.headerfn.layout();
                      }, function onSearchTestsReject(err) {
                         $scope.testsFound = {};
                         $scope.logger.error("Search test error", err);
                      });
               }
               else
               {
                  $scope.testsFound = {};
               }
            };

            $scope.getCoverUrl = swManageTestService.getPublicationCover;

            $scope.importTest = function (id)
            {
               //debugger;//service client - NOT TESTED
               swManageTestsService.getTest(id).then(function onImportTest(data) {
                  $scope.tests = $scope.tests.concat(data.testQuestions.map(function(_test) {
                    delete _test._id;
                    delete _test._rev;
                    delete _test.testId;
                    return _test;
                  }));
                  $scope.testQuestion = $scope.tests[$scope.tests.length - 1];
                  $scope.numberTest = $scope.tests.length - 1;
                  $scope.currentTestQuestionIndex = $scope.tests.length - 1;
                  $scope.headerfn.onImportBackClick();
               }, function onImportTestReject(err) {
                  $scope.logger.error(err);
                  $scope.headerfn.onImportBackClick();
               });
            };

            $scope.headerfn.isDisabledExport = function ()
            {
              return $scope.tests.length === 0;
            };

            $scope.headerfn.exportTest = function ()
            {
               var testOmittedFields     = ['_rev', 'publicationId'];
               var questionOmittedFields = ['testId', '_rev'];
               var testForExport = _.omit($scope.testData, testOmittedFields);

               if ($scope.tests.length) {
                  testForExport.testQuestions = $scope.tests.map(function (question) {
                     return _.omit(question, questionOmittedFields);
                  });
               }
               else
               {
                  testForExport.testQuestions = [$scope.testQuestion];
               }

               $scope.quizlet = JSON.stringify(testForExport, null, 2);
               $scope.popupsettings.isTestImport        = true;
               $scope.popupsettings.isOtherSourceImport = true;
               $scope.popupsettings.isTestExport        = true;
            };

            $scope.headerfn.onImportBackClick = function ()
            {
               $scope.popupsettings.isTestImport        = false;
               $scope.popupsettings.isOtherSourceImport = false;
               $scope.popupsettings.isTestExport        = false;
               $scope.isQuizletImport                    = false;
               $scope.testsFound                         = {};
               $scope.quizlet                            = "";
               $scope.headerfn.layout();
            };

            $scope.headerfn.startJSONImport = function ()
            {
               showQuizletTextArea();
               $scope.headerfn.layout();
            };

            $scope.headerfn.startQuizletImport = function ()
            {
               showQuizletTextArea();
               $scope.isQuizletImport = true;
               $scope.headerfn.layout();
            };

            $scope.importFromOtherSource = function ()
            {
               if ($scope.isQuizletImport)
               {
                  importFromQuizlet();
               }
               else {
                  importFromJSON();
               }
            };

            $scope.selectAll = function ()
            {
               if ($scope.popupsettings.isTestExport)
               {
                  $window.document.querySelector("[data-ng-model='quizlet']").select();
               }
            };

            $scope.headerfn.persistTest = function ()
            {
               var lastTestQuestionIndex = _.indexOf($scope.tests, $scope.testQuestion);

               swValidationService.setValidationMessagesEnabled($scope.popupsettings.form, true);

               if ($scope.popupsettings.form.$valid)
               {
                  if (lastTestQuestionIndex === -1)
                  {
                     setFlashcardTypes();
                     $scope.tests.push($scope.testQuestion);
                  }

                  $scope.testData.testQuestions = _.map($scope.tests, function (test) {
                     return test;
                  });

                  $scope.popupsettings.disabled = true;

                  if (!$scope.testData._id)
                  {
                     $scope.testData._id = swUtil.uuid();
                  }

                  //debugger;//service client - result is not used
                  swManageTestsService.persistTest($scope.testData)
                      .then(function () {
                         if(!$scope.testData.type){
                            $scope.testData.type = 'Test';
                         }
                        $scope.testData.testQuestionsCount = $scope.testData.testQuestions.length;
                        editingCompletion($scope.testData);
                         swValidationService.setValidationMessagesEnabled($scope.popupsettings.form, false);
                      }, function () {
                         $scope.logger.error('Error saving Test');
                      });
               }
            };

            $scope.addTestQuestion = function ()
            {
               var testQuestionIndex = _.indexOf($scope.tests, $scope.testQuestion);

               swValidationService.setValidationMessagesEnabled($scope.popupsettings.form, true);

               if ($scope.popupsettings.form.$valid)
               {
                  if (testQuestionIndex === -1)
                  {
                     setFlashcardTypes();
                     $scope.tests.push($scope.testQuestion);
                  }
                  $scope.currentTestQuestionIndex = $scope.tests.length;
                  $scope.numberTest = $scope.tests.length;
                  $scope.isImageEmpty = true;
                  $scope.isAudioUploaded = false;
                  $scope.testQuestion = {};

                  swValidationService.setValidationMessagesEnabled($scope.popupsettings.form, false);
               }
            };

            $scope.deleteTestQuestion = function ()
            {
              $scope.numberTest =  $scope.numberTest > 0 ? $scope.numberTest -=1 : $scope.numberTest;
              if($scope.testQuestion && Object.keys($scope.testQuestion).length === 0 || _.indexOf($scope.tests, $scope.testQuestion) === -1){
                getPrev();
              }
              else{
                $scope.tests.splice($scope.currentTestQuestionIndex, 1);
                if($scope.tests.length === 0){
                  $scope.numberTest = 0;
                  $scope.currentTestQuestionIndex = 0;
                }
                getPrev();
              }
            };

            $scope.startUpload = function()
            {
               $scope.isLoading = true;
            };

            $scope.uploadFile = function (fileData)
            {
               $scope.fileType = /\w*\//.exec(fileData.type)[0].replace('/', '');
               var fileType = $scope.fileType.charAt(0).toUpperCase() + $scope.fileType.slice(1);

               if ( $scope.fileType === 'image' && fileData.size > MAX_IMG_SIZE ||
                    $scope.fileType === 'audio' && fileData.size > MAX_AUDIO_SIZE )
               {
                  $scope.isLoading = false;
                  return;
               }

               $scope['is' + fileType + 'Uploaded'] = false;

               //debugger;//service client - NOT TESTED
               swManageTestsService.uploadAttachment(fileData)
                   .then(function (data) {
                      $scope.testQuestion = $scope.testQuestion || {};
                      $scope.testQuestion[$scope.fileType] = data.fileHash;
                      $scope.isLoading = false;
                      $scope['is' + fileType + 'Uploaded'] = true;

                      if ($scope.fileType === 'image')
                      {
                         $scope.isImageEmpty = false;
                         $scope.imgPreviewSrc = $window.URL.createObjectURL(fileData);
                      }
                   });
            };

            $scope.deleteUploadedFile = function (fileType)
            {
               if (fileType === 'image')
               {
                  delete $scope.testQuestion.image;
                  $scope.isImageEmpty = true;
               }
               if (fileType === 'audio')
               {
                  delete $scope.testQuestion.audio;
                  $scope.isAudioUploaded = false;
               }
            };

            var getPrev = function(){
              $scope.currentTestQuestionIndex = $scope.currentTestQuestionIndex > 0 ? --$scope.currentTestQuestionIndex : 0;
              $scope.testQuestion = $scope.tests[$scope.currentTestQuestionIndex];
            };

            var getNext = function(){
              var lastIndex = $scope.tests.length !== 0 ? $scope.tests.length - 1 : 0;
              $scope.currentTestQuestionIndex = $scope.currentTestQuestionIndex < lastIndex ? ++$scope.currentTestQuestionIndex : lastIndex;
              if($scope.tests[$scope.currentTestQuestionIndex]){
                $scope.testQuestion = $scope.tests[$scope.currentTestQuestionIndex];
              }
            };

            $scope.showPrev = function ()
            {
              swValidationService.setValidationMessagesEnabled($scope.popupsettings.form, true);
              if ($scope.popupsettings.form.$valid) // show prev
              {
                if($scope.currentTestQuestionIndex ===  $scope.tests.length){ //add last test
                  setFlashcardTypes();
                  $scope.tests.push($scope.testQuestion);
                }
                getPrev();
                swValidationService.setValidationMessagesEnabled($scope.popupsettings.form, false);
              }
              isFileExists();
            };

            $scope.showNext = function ()
            {
              swValidationService.setValidationMessagesEnabled($scope.popupsettings.form, true);
              if($scope.popupsettings.form.$valid && _.indexOf($scope.tests, $scope.testQuestion) !== -1){
                getNext();
                swValidationService.setValidationMessagesEnabled($scope.popupsettings.form, false);
              }

              isFileExists();
            };

            $scope.getCurrentTestIndex = function ()
            {
               return $scope.currentTestQuestionIndex + 1;
            };

            $scope.getNumberTests = function(){
              return $scope.numberTest + 1;
            };

            $scope.validateField = function (value)
            {
               return {
                  required: {
                     value: value,
                     valid: value
                  }
               };
            };

            $scope.headerfn.closePopup = function ()
            {
               swManageTestService.close();
            };

            $scope.clearQuizlet = function ()
            {
               $scope.quizlet = "";
            };

            $scope.reset = function ()
            {
               $scope.error = false;
            };

            function isFileExists ()
            {
               if ($scope.testQuestion)
               {
                  $scope.isAudioUploaded = $scope.testQuestion.audio ? true : false;
                  $scope.isImageUploaded = $scope.testQuestion.image ? true : false;

                  showImgPreview();
               }
            }

            function editingCompletion(testData)
            {
               $scope.popupsettings.disabled = false;
               swManageTestService.close(testData);
            }

            function setFlashcardTypes()
            {
               $scope.testQuestion.type = "BasicFact";
            }

            function showQuizletTextArea()
            {
               $scope.testsFound          = {};
               $scope.popupsettings.testSearchCriteria  = '';
               $scope.popupsettings.isOtherSourceImport = true;
               $scope.JSONIsInvalid       = false;
            }

            function importFromQuizlet()
            {
               var wordDefDelimeter = '\t';
               var defWordDelimeter = '\n';
               var terms = [];
               var definitions = [];
               var splitRegExp = /([a-z0-9]+)\W+([a-z0-9]+)/i;

               $scope.quizlet.split(defWordDelimeter).forEach(function (term)
               {
                  var termDefArray = term.split(wordDefDelimeter);

                  if (termDefArray.length > 1)
                  {
                     terms.push(termDefArray[0]);
                     definitions.push(termDefArray[1]);
                  }
                  else
                  {
                     termDefArray = splitRegExp.exec(term);
                     if (termDefArray)
                     {
                        terms.push(termDefArray[1]);
                        definitions.push(termDefArray[2]);
                     }
                  }
               });

               $scope.tests = $scope.tests.concat(terms.map(function (term, index)
               {
                  var incorrects = swManageTestService.getRandomIndexes(index, definitions.length, 3);

                  return {
                     question : term,
                     answer   : definitions[index],
                     type     : "BasicFact",
                     incorrectAnswers : {
                        0: definitions[incorrects[0]],
                        1: definitions[incorrects[1]],
                        2: definitions[incorrects[2]]
                     }
                  };
               }));
               $scope.numberTest = $scope.tests.length - 1;
               $scope.currentTestQuestionIndex = $scope.tests.length - 1;
               $scope.testQuestion = $scope.tests[$scope.tests.length - 1];
               $scope.headerfn.onImportBackClick();
            }

            function importFromJSON()
            {
              var testClone = {};
              var questionsClone = [];

              try {
                testClone = JSON.parse($scope.quizlet);
              }
              catch (e) {
                $scope.JSONIsInvalid = true;
              }

              if (!$scope.JSONIsInvalid) {
                if (Array.isArray(testClone.testQuestions)) {
                  questionsClone = testClone.testQuestions.map(function(test) {
                    delete test._id;
                    return test;
                  });
                }

                delete testClone.testQuestions;
                delete testClone._id;

                _.defaults($scope.testData, testClone);
                $scope.tests = $scope.tests.concat(questionsClone);
                $scope.numberTest = $scope.tests.length - 1;
                $scope.currentTestQuestionIndex = $scope.tests.length - 1;
                $scope.testQuestion = $scope.tests[$scope.tests.length - 1];
                $scope.headerfn.onImportBackClick();
              }
            }

            function showImgPreview () {
               if ($scope.isImageUploaded)
               {
                  //debugger;//service client - result is not used
                  $scope.imgPreviewSrc = swManageTestsService.getTestFileSource($scope.testQuestion.image);
                  $scope.isImageEmpty = false;
               }
               else
               {
                  $scope.isImageEmpty = true;
               }
            }

            function getTestIcon(testType) {
               var testIconsLetter = {
                  "Flashcard": "D",
                  "Quiz": "Q"
               };
               return testIconsLetter[testType];
            }

         }]
   });
});