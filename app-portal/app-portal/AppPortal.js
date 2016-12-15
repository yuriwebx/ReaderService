define([
    'swComponentFactory',
    'Context',
    'module',
    'text!./AppPortal.html',
    'less!./AppPortal'

], function (swComponentFactory, Context, module, template) {

    'use strict';

    swComponentFactory.create({
        module : module,
        template : template,
        submachine : true,
        controller : ['$scope',
            '$window',
            'swUserService',
            'swLoginService',
            'swApplicationService',
            function ($scope, $window, swUserService, swLoginService, swApplicationService) {
                var currentUrl = $window.location.href;

                $scope.configInfo = Context.parameters;
                
                $scope.hidePortalButton = true;
                $scope.registerApi      = {};

                $scope.swInit = function () {
                    $scope.config = {};
                    $scope.hidePortalButton = true;

                    var applicationLinks = [];
                    var platforms = $scope.configInfo.platforms;
                    if (platforms) {
                        var i = 0;
                        while(platforms[i]) {
                            applicationLinks.push([platforms[i], $scope.getPlatformLink(platforms[i])]);
                            i++;
                        }
                    }
                    $scope.applicationLinks = applicationLinks;

                    swUserService.bootstrapApplication().then(_autoLogIn, _autoLogIn).then(_confirmAuthorizedTask).then(_goOnConfirm, _goOnAuth);
                };


                function _confirmAuthorizedTask() {
                    return swApplicationService.confirmAuthorizedTask();
                }

                function _autoLogIn() {
                   return swLoginService.autoLogIn();
                }

                function _goOnConfirm(result) {
                    $scope.config.taskConfirmationHashCode = result.taskConfirmationHashCode;
                    $scope.swSubmachine.go(result.useCaseToGo);
                }

                function _goOnAuth() {
                    $scope.swSubmachine.go('Portal');
                }

                $scope.goVocabularyAssessment = function () {
                    $window.location.href = prepareAppUrl('vocabulary');
                };

                $scope.getPlatformLink = function(platform) {
                    platform = platform.toUpperCase();
                    var funcName =  "getLinkFor" + platform;
                    var fn = $scope[funcName];
                    var link = '';

                    if (typeof fn === "function"){
                        link = fn();
                    }
                    return link;
                };

                $scope.getLinkForWEB = function() {
                    return prepareAppUrl('reader');
                };

                $scope.getLinkForIOS = function() {
                    return prepareAppUrlForIOS();
                };

                $scope.getLinkForANDROID = function() {
                    return prepareAppUrlForAndroid();
                };

                function prepareAppUrl(applicationName) {
                    return currentUrl.replace(/(\/portal\/)+/g, '\/' + applicationName + '/')
                        .replace(/#.*$/, '');
                }

                function prepareAppUrlForIOS() {
                    var modifiedUrl;
                    var manifestUrl = 'itms-services://?action=download-manifest&url=';

                    modifiedUrl = currentUrl.replace(/(\/portal)[A-Za-z\/\.]+/g, '');
                    modifiedUrl = modifiedUrl.replace(/[-]+/g, '__');
                    modifiedUrl = modifiedUrl.replace(/[/]+/g, '-');
                    modifiedUrl = modifiedUrl.replace(/[:]+/g, '_');
                    modifiedUrl = modifiedUrl.replace(/#+/g, '');
                    manifestUrl = manifestUrl + currentUrl.replace(/\/portal\/#+/g,'') + 'manifest-' + modifiedUrl + '.plist';

                    return manifestUrl;
                }
                
                function prepareAppUrlForAndroid() {
                    var apkUrl;
                    apkUrl = currentUrl.replace(/portal\/\#\//g,'') + 'artifacts/' + $scope.configInfo.apkName + '.apk';
                    return apkUrl;
                }

                $scope.isUserLoggedIn = function () {
                    return swUserService.isAuthenticated();
                };

                $scope.signIn = function ($event) {
                    swLoginService.showLoginPopup($event);
                };

               $scope.swSubmachine.$onRegisterUserProfile$completed = function () {
                  $scope.swSubmachine.go('Portal');
               };
               $scope.swSubmachine.$onResetPassword$completed = function () {
                  $scope.swSubmachine.go('Portal');
               };

                $scope.swSubmachine.$onAnyState$back = function() {
                    $scope.swSubmachine.go('Portal');
                };

                $scope.getRenderedState = function(){
                    var state = $scope.swSubmachine.context().currState;
                    if(state === 'RegisterUserProfile' || state === 'ResetPassword'){
                        return $scope.swSubmachine.state(state);
                    }
                };
            }]
    });
});