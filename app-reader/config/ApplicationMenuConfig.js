define([
   'module',
   'ngModule',
   'swLoggerFactory'

], function (module, ngModule, swLoggerFactory) {

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.run([
      '$window',
      'swApplicationToolbarService',
      'swApplicationMenuService',
      'swGetSystemAboutInfoService',
      'swLoginService',
      'swManageUserProfileService',
      'swBookInfoService',
      'swAssessmentMenuService',
      'swPersonalMessagesMenuService',
      'swStudyCourseService',
      'swBeginNewCourseService',
      'swUserService',
      'swRecentBooksService',
      'swReaderToolbarService',
      function(
         $window,
         swApplicationToolbarService,
         swApplicationMenuService,
         swGetSystemAboutInfoService,
         swLoginService,
         swManageUserProfileService,
         swBookInfoService,
         swAssessmentMenuService,
         swPersonalMessagesMenuService,
         swStudyCourseService,
         swBeginNewCourseService,
         swUserService,
         swRecentBooksService,
         swReaderToolbarService
      )
      {
         logger.trace('run');
         //here base set _menuSections for Reader, customization in swApplicationMenuService for Editor and Reader
         var applicationMenuConfig = {
            _menuSections : [ 
               [

               ],
               [
                  'Overview',
                  'Extras',
                  'PersonalMess',
                  'Assessments',
                  'ReadModeSettings'
               ],
               [
                  'Library',
                  'ResumeReading',
                  'Explore',
                  'Dictionary',
                  'Flashcards',
                  'NewStudyProject',
                  'CreateNewCourseSyllabus'
               ],
               [
                  'LibraryContentEditor',
                  'Profile',
                  'Logout'
               ],
               [
                  'About'
               ]
            ],
            'Profile' : {
               deeplink: null,
               handler: function () {
                  swManageUserProfileService.showUserProfilePopup('Personal');
               },
               loginStatus: 'shown',
               offlineStatus: 'hidden',
               config: true
            },
            'About' : {
               deeplink: null,
               handler: swGetSystemAboutInfoService.showAboutPopup,
               loginStatus: 'ignore',
               config: true
            },
            'Logout' : {
               deeplink: null,
               handler: function () {
                  //debugger;//service client - result is not used 
                  swLoginService.logout().then(function(){
                     $window.location.href = $window.location.href.replace(/#.*$/,'');
                     // swSubmachine.getStack()[0].submachine.go('Login');
                  });
               },
               loginStatus: 'shown',
               offlineStatus: 'hidden',
               config: true
            },
            'Login' : {
               deeplink: null,
               handler: function ($event) { //TODO: need investigate where using
                  swLoginService.showLoginPopup($event);
               },
               loginStatus: 'hidden',
               offlineStatus: 'hidden',
               config: true
            },
            'Library' : {
               deeplink: '/managepublications',
               handler: null,
               loginStatus: 'ignore',
               config: true
            },
            'ResumeReading' : {
               deeplink: null,
               handler: function(){
                  var lastRecentItem = swRecentBooksService.getLastRecentItem();
                  swRecentBooksService.openRecentBook(lastRecentItem);
               },
               loginStatus: 'ignore',
               config: function() {
                  var listbooks =  swBookInfoService.getLastBookInfo();
                  return !!listbooks;
               }
            },
            'Explore' : {
               deeplink: '/explore',
               handler: null,
               loginStatus: 'ignore',
               offlineStatus: 'hidden',
               config: true
            },
            'Dictionary' : {
               deeplink: '/dictionary',
               handler: null,
               loginStatus: 'ignore',
               offlineStatus: 'hidden',
               config: true
            },
            'Flashcards' : {
               deeplink: '/reviewassignedflashcards',
               handler: null,
               loginStatus: 'ignore',
               config: true
            },
            'NewStudyProject' : {
               deeplink: null,
               handler: function(){
                  swBeginNewCourseService.showPopup();
               },
               loginStatus: 'ignore',
               config: true
            },
            'CreateNewCourseSyllabus': {
               deeplink: null,
               handler: swStudyCourseService.persistStudyCourseAndUserPublication,
               loginStatus: 'ignore',
               offlineStatus: 'hidden',
               config: true
            },
            'Discussions' : {
               deeplink: '/discussions',
               handler: null,
               loginStatus: 'shown',
               offlineStatus: 'hidden',
               config: true
            },
            'Overview' : {
               deeplink: null,
               handler: swReaderToolbarService.openClassInfo,
               loginStatus: 'shown',
               offlineStatus: 'hidden',
               config: true
            },
            'Extras' : {
               deeplink: null,
               handler: function() {
                  var isFromClassEntered = swApplicationToolbarService.isFromClassEntered();
                  swReaderToolbarService.onExtrasToggle({visible: true, fromClass: isFromClassEntered});
               },
               loginStatus: 'shown',
               config: true
            },
            'PersonalMess' : {
               deeplink: null,
               handler: swPersonalMessagesMenuService.showPopup,
               loginStatus: 'shown',
               offlineStatus: 'hidden',
               config: true
            },
            'Assessments' : {
               deeplink: null,
               handler: swAssessmentMenuService.showPopup,
               loginStatus: 'shown',
               offlineStatus: 'hidden',
               config: true
            },
            'ReadModeSettings' : {
               deeplink: null,
               handler: swReaderToolbarService.showSettingsPopup,
               loginStatus: 'shown',
               offlineStatus: 'hidden',
               config: true
            },
            'LibraryContentEditor' : {
               deeplink : null,
               handler  : swUserService.goLibraryContentEditor,
               loginStatus: 'shown',
               offlineStatus: 'hidden',
               config: true
            }
         };
         
         swApplicationMenuService.configure(applicationMenuConfig);
      }
   ]);
});