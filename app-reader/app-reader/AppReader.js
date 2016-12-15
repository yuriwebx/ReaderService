define([
   'module',
   'underscore',
   'swAppUrl',
   'swComponentFactory',
   'Context',
   'text!./AppReader.html',
   'less!./AppReader.less'
], function (module, _, swAppUrl, swComponentFactory, Context, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine: true,
      isolatedScope: {
         isEditor: '@'
      },
      controller: [
         '$q',
         '$scope',
         '$timeout',
         'swSubmachine',
         'swRestService',
         'swUserService',
         'swLoginService',
         'swPopupService',
         'swApplicationToolbarService',
         '$window',
         'swUnifiedSettingsService',
         'swStudyFlashcardsService',
         'swPublicationsService',
         'swApplicationService',
         'swOpenPublicationService',
         'swStudyClassService',
         'swStudyCourseService',
         'swUserPublicationService',
         'swNotificationService',
         'swUpdateService',
         'swPersonalMessageService',
         'swLocalStorageService',
         'swOfflineModeService',
         'SettingsStorageKey',
         'swManageClassDiscussionsService',
         'swDownloadManager',
         function ($q, $scope, $timeout, swSubmachine, swRestService, swUserService, swLoginService, swPopupService,
                   swApplicationToolbarService, $window, swUnifiedSettingsService, swStudyFlashcardsService,
                   swPublicationsService, swApplicationService, swOpenPublicationService, swStudyClassService,
                   swStudyCourseService, swUserPublicationService, swNotificationService, swUpdateService,
                   swPersonalMessageService, swLocalStorageService, swOfflineModeService, SettingsStorageKey,
                   swManageClassDiscussionsService, swDownloadManager) {

            var vm            = $scope;
            var readingParams = {};
            $scope.loggedIn       = swUserService.isAuthenticated;
            $scope.loggedOut      = swUserService.isLoggedOut;

            vm.isToolbarVisible = true;
            vm.config           = {};
            vm.registerApi      = {};
            vm.studyCourseData  = {};
            vm.courseApi        = {};

            var _createCourseApi = function (params) {
               vm.courseApi = vm.courseApi || {};
               vm.courseApi = _.extend(vm.courseApi, params);
            };

            vm.swSubmachine.configure({
               'Loading': {
                  uri: 'loading'
               },
               'Register': {
                  uri: 'register'
               },
               'Reading': {
                  uri: 'reader',
                  params: [
                     {
                        name: '_type',
                        optional: true
                     },
                     {
                        name: '_id',
                        optional: true
                     },
                     {
                        name: '_extid',
                        optional: true
                     },
                     {
                        name: '_studyCourseId',
                        optional: true
                     },
                     {
                        name: '_classId',
                        optional: true
                     },
                     {
                        name: '_locator',
                        optional: true
                     }
                  ],
                  getParams: function () {
                     return readingParams;
                  },
                  setParams: function (rParams) {
                     readingParams = rParams;
                     return true;
                  }
               },
               'ManagePublications': {
                  uri: 'managepublications'
               },
               'Explore': {
                  uri: 'explore'
               },
               'Dictionary': {
                  uri: 'dictionary'
               },
               'ReviewAssignedFlashcards': {
                  uri: 'reviewassignedflashcards'
               },
               'DevelopStudyCourse': {
                  uri: 'developstudycourse',
                  params: [
                     {
                        name: '_id'
                     }
                  ],
                  getParams: function () {
                     return {
                        _id: vm.studyCourseData._id
                     };
                  },
                  setParams: function (params) {
                     vm.studyCourseData._id = params._id;
                     return true;
                  }
               },
               'ManageStudyClass': {
                  uri: 'managestudyclass',
                  params: [
                     {
                        name: 'classId'
                     }
                  ],
                  getParams: function () {
                     return {
                        classId: vm.courseApi.classId
                     };
                  },
                  setParams: function (params) {
                     vm.courseApi.classId = params.classId;
                     return true;
                  }
               }
            }, {customStart: true});

            vm.readingApi = {
               open: null,
               unboldText: null,
               isRepeatSet: false,
               setOpenFn: function (fn) {
                  if ( this.open ) {
                     this.isRepeatSet = true;
                  }
                  this.open = fn;
               },
               setUnboldTextFn: function (fn) {
                  if ( this.unboldText ) {
                     this.isRepeatSet = true;
                  }
                  this.unboldText = fn;
               },
               clear: function () {
                  if ( this.isRepeatSet ) {
                     this.isRepeatSet = false;
                  }
                  else {
                     this.open = null;
                     this.unboldText = null;
                  }
               },
               isReady: function () {
                  return !!this.open;
               }
            };

            function openPublication(_id, locator, options, isToBeStudied) {
               options = options || {};
               if ( (options.reload !== false) && (!vm.readingApi.open || (readingParams._id !== _id)) ) {
                  readingParams._id = _id;
                  goToReading({
                     _id: _id,
                     _type: options.type,
                     locator: locator,
                     options: options
                  });
               }
               else if ( isToBeStudied ) {
                  goToReading({
                     _id: _id,
                     _type: options.type,
                     locator: locator,
                     options: options
                  });
               }
               else if ( vm.readingApi.isReady() ) {
                  vm.readingApi.open(_id, locator, options);
               }
               else {
                  goToReading({
                     _id: _id,
                     _type: options.type,
                     locator: locator,
                     options: options
                  });
               }
            }

            function beginUserStudy(id, locator, options) {
               readingParams = {
                  _id: !options.isStudyCourse && id,
                  _studyCourseId: options.isStudyCourse && id,
                  _classId: options._classId,
                  _type: options.type,
                  locator: locator,
                  options: options
               };

               vm.swSubmachine.go('Reading', readingParams);
            }

            function resumeCourse(courseApi) {
               _createCourseApi(courseApi);
               vm.swSubmachine.go('ManageStudyClass');
            }

            function editCourse(courseId) {
               vm.studyCourseData = {};
               vm.studyCourseData._id = courseId;
               vm.swSubmachine.go('DevelopStudyCourse');
            }

            vm.unboldText = function () {
               if ( vm.readingApi.unboldText ) {
                  vm.readingApi.unboldText();
               }
            };

            vm.swInit = function () {
               swApplicationToolbarService.setIsEditor(vm.isEditor);
               swOpenPublicationService.addOpenPublicationListener(openPublication);
               swOpenPublicationService.setBeginUserStudyFn(beginUserStudy);
               swStudyClassService.setResumeCourseFn(resumeCourse);
               swStudyCourseService.setEditCourseFn(editCourse);
               if($window.cordova){
                  $window.navigator.splashscreen.hide();
               }
               swUserService.bootstrapApplication()['finally'](_onBootstrapApplication).then(function () {
               }, _onAuthorizedFail);
            };

            vm.swDestroy = function () {
               swOpenPublicationService.removeOpenPublicationListener(openPublication);
            };

            function _appLoading () {
               var settings = _convertSettings(swLocalStorageService.get(SettingsStorageKey));
               swUnifiedSettingsService.updateGroups(settings);

               return swDownloadManager.init().then(function () {
                  if ( swOfflineModeService.isOffline() ) {
                     processSettings();
                     return $q.when();
                  }
                  else {
                     return swRestService.restRequest('get', 'Settings', {}).then(processSettings);
                  }
               });
            }

            function processSettings (resp) {
               if ( resp ) {
                  if ( resp.data.statusMessages && resp.data.statusMessages[0].severity === 'ERROR' ) {
                     return $q.reject();
                  }
                  var settings = _convertSettings(resp.data);
                  swUnifiedSettingsService.updateGroups(settings);
               }
               swNotificationService.addNotificationListener('flashcards', _.constant({}), swStudyFlashcardsService.addSearchFlashcardStudiesListener);
               swNotificationService.addNotificationListener('messages', _.constant({}), swPersonalMessageService.setNumberMessages);
               swNotificationService.addNotificationListener('userDiscussions', _.constant({}), swManageClassDiscussionsService.setUnreadDiscussions);
               $timeout(function () {
                  swNotificationService.ping();
               });
            }

            function _convertSettings (settings) {
               settings = settings || [];
               return settings.reduce(function (memo, setting) {
                  var group = memo[setting.group] = (memo[setting.group] || {});
                  group[setting.name] = setting.value;
                  return memo;
               }, {});
            }

            function _onBootstrapApplication () {
               return _initFS().then(function () {
                  swUpdateService.init();
                  return swLoginService.autoLogIn().then(function () {
                     return swApplicationService.confirmAuthorizedTask();
                  }).then(_onConfirmationSuccess);
               });
            }

            function _onConfirmationSuccess (result) {
               vm.config.taskConfirmationHashCode = result.taskConfirmationHashCode;
               vm.swSubmachine.go(result.useCaseToGo);
            }

            function _onAuthorizedFail () {
               swUserService.init();
               if ( swUserService.isAuthenticated() ) {
                  _appLoading().then(_start, vm.signIn);
               }
               else {
                  swLocalStorageService.set('fragmentOfShareUrl', swAppUrl.fragment);
                  vm.swSubmachine.go('Login');
               }
            }

            function _initFS () {
               var deferred = $q.defer();
               swPublicationsService.initFS(deferred.resolve);
               return deferred.promise;
            }

            vm.swSubmachine.$onLogin$loggedIn = function () {
               //debugger;//service client - result is not used
               _appLoading().then(function () {
                  if ( vm.message ) {
                     var resultsPopup = swPopupService.show({
                        template: '<sw-login-results></sw-login-results>'
                     });
                     $timeout(resultsPopup.hide, 3000);
                  }
                  _start();
               });
            };

            vm.swSubmachine.$onLogin$pendingLogIn = function () {
               vm.registerApi.pendingLogIn = true;
               vm.swSubmachine.go('RegisterUserProfile');
            };

            vm.swSubmachine.$onLogin$registerProfile = function () {
               vm.swSubmachine.go('RegisterUserProfile');
            };

            vm.swSubmachine.$onManagePublications$openStudyCourse = function () {
               vm.swSubmachine.go('DevelopStudyCourse');
            };

            vm.swSubmachine.$onLogin$resetPassword = function () {
               vm.swSubmachine.go('ResetPassword');
            };

            vm.swSubmachine.$onRegisterUserProfile$completed = function () {
               _start();
            };

            vm.swSubmachine.$onResetPassword$completed = function () {
               _start();
            };

            function _start() {
               swUserPublicationService.getRecentBooks();
               var storedFragment = swLocalStorageService.get('fragmentOfShareUrl');
               var user = swUserService.getUser() || {};

               if ( user.active === 'Registered' ) {
                  vm.registerApi.pendingLogIn = true;
                  vm.swSubmachine.go('RegisterUserProfile');
               }
               else if ( user.active === 'Declined' ) {
                  vm.swSubmachine.go('Login');
               }
               else if ( swApplicationToolbarService.isEditor() && !user.editorRole ) {
                  $window.location.href = $window.location.href.replace('/editor/', '/reader/').replace(/#.*$/, '');
               }
               else if ( storedFragment && storedFragment !== '/' ) {
                  swAppUrl.fragment = storedFragment;
                  swLocalStorageService.remove('fragmentOfShareUrl');
                  swSubmachine.deeplink(swAppUrl.fragment);
               }
               else {
                  vm.swSubmachine.start('ManagePublications');
                  // 'start' (not 'go'!): deeplink is processed at this point
                  // note that 'customStart' is configured
               }
            }

            function goToReading(params) {
               readingParams = params || vm.swSubmachine.context().params;
               vm.swSubmachine.go('Reading', params);
            }

            vm.swSubmachine.$onExplore$openInReader = function () {
               goToReading();
            };

            vm.swSubmachine.$onReading$newBookSelected = function () {
               goToReading();
            };

            vm.switchToolbar = function () {
               vm.$apply(function () {
                  vm.isToolbarInverted = !vm.isToolbarInverted;
                  vm.logger.debug('Toolbar switched. Now ' + (vm.isToolbarInverted ? '' : 'in') + 'visible');
               });
            };

            vm.swSubmachine.$onAnyState$back = function () {
               vm.swSubmachine.go('ManagePublications');
            };

            vm.signIn = function () {
               vm.swSubmachine.go('Login');
            };

            vm.checkRanderState = function () {
               return vm.swSubmachine.state('RegisterUserProfile') || vm.swSubmachine.state('ResetPassword');
            };

            var _authChecker = function () {
               if ( !swUserService.isAuthenticated() && !/#\/\w/.test($window.location.href) ) {
                  $window.location.href = $window.location.href.replace(/(\/(?:reader|editor)\/[^\/])*#.*$/, '$1');
               }
            };
            var _checkMethods = Context.parameters.appReaderRestrictedStates || [];
            _checkMethods.forEach(function (method) {
               vm.swSubmachine['$on' + method + '$enter'] = _authChecker;
            });
         }]

   });
});