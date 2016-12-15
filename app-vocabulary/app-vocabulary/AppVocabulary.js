define([
    'swComponentFactory',
    'Context',
    'module',
    'text!./AppVocabulary.html',
    'less!./AppVocabulary'

], function (swComponentFactory, Context, module, template) {

    'use strict';

    swComponentFactory.create({
        module : module,
        template : template,
        submachine : true,
        controller : ['$scope',
            '$window',
            'swDirectVocabularyService',
            'swBinaryVocabularyService',
            'swUpperBoundVocabularyService',
            'swVocabularyAssessmentService',
            function($scope,
                $window,
                swDirectVocabularyService,
                swBinaryVocabularyService,
                swUpperBoundVocabularyService,
                swVocabularyAssessmentService) {
                
                var currentUrl = $window.location.href;

                $scope.configInfo = Context.parameters;

                $scope.swInit = function () {
                    $scope.swSubmachine.go('Vocabulary');
                };

                $scope.directVocabulary = function () {
                    var settings = {wait : false};
                    swVocabularyAssessmentService.startAssessment(swDirectVocabularyService, settings);
                };

                $scope.binaryVocabulary = function () {
                    var settings = {wait : false};
                    swVocabularyAssessmentService.startAssessment(swBinaryVocabularyService, settings);
                };

                $scope.upperBoundVocabulary = function () {
                    var settings = {wait : false};
                    swVocabularyAssessmentService.startAssessment(swUpperBoundVocabularyService, settings);
                };

             
                $scope.goPortal = function () {
                    $window.location.href = prepareAppUrl('portal');
                };

                function prepareAppUrl(applicationName) {
                    return currentUrl.replace(/(\/vocabulary\/)+/g, '\/' + applicationName + '/')
                        .replace(/#.*$/, '');
                }

                $scope.swSubmachine.$onRegisterUserProfile$completed = function () {
                  $scope.swSubmachine.go('Vocabulary');
                };
                
                $scope.swSubmachine.$onResetPassword$completed = function () {
                  $scope.swSubmachine.go('Vocabulary');
                };

                $scope.swSubmachine.$onAnyState$back = function() {
                    $scope.swSubmachine.go('Vocabulary');
                };

            }]
    });
});