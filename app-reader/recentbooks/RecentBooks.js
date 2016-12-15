define([
   'module',
   'Context',
   'swComponentFactory',
   'moment',
   'text!./RecentBooks.html',
   'less!./RecentBooks.less'
], function(module, Context, swComponentFactory, moment, template) {
   'use strict';
   
   swComponentFactory.create({
       module : module,
       template : template,
       isolatedScope:{
          headerfn    : '=',
          headerconfig: '='
       },
       controller : ['$scope',
                     'swRecentBooksService',
                     'swPublicationsService',
                     'swApplicationToolbarService',
                     'swSubmachine',
          function($scope,
                   swRecentBooksService,
                   swPublicationsService,
                   swApplicationToolbarService,
                   swSubmachine
                   ) {

           var publicationType = ['Book', 'StudyGuide', 'StudyCourse'],
               publicationList = [],
               studyActivitiesList = [],
               tabNames = {
                  booksTab: 'publication',
                  studyActivitiesTab: 'StudyClass'
               };

           $scope.isEditor = swApplicationToolbarService.isEditor();
           $scope.headerconfig.isEditor = $scope.isEditor;
           $scope.headerconfig.tabNames = tabNames;
           $scope.booklist = [];
           $scope.isPublications = true;

           $scope.swInit = function() {
              $scope.booklist = [];
              publicationList = $scope.headerconfig.publicationList;
              studyActivitiesList = $scope.headerconfig.studyActivitiesList;
              $scope.booklist = publicationList;
              $scope.headerconfig.openedTab = swRecentBooksService.getCurrentTab();
              $scope.headerfn.selectRecentPublicationTab($scope.headerconfig.openedTab);
              swRecentBooksService.reRender();
           };

           $scope.bookItemSelected = function(bookItem){
            var lastRecentItem = swRecentBooksService.getLastRecentItem();
            var currentState = swSubmachine.getStack().length && swSubmachine.getStack()[0].currState;
            if(bookItem._id !== lastRecentItem._id || currentState !== 'Reading'){
              swRecentBooksService.openRecentBook(bookItem);
            }
           };

           $scope.headerfn.selectRecentPublicationTab = function(tab) {
              $scope.headerconfig.openedTab = tab;
              if (tab === $scope.headerconfig.tabNames.booksTab || $scope.isEditor) {
                $scope.booklist = publicationList;
                $scope.isPublications = true;
              }
              else if(tab === $scope.headerconfig.tabNames.studyActivitiesTab){
                $scope.booklist = studyActivitiesList;
                $scope.isPublications = false;
              }
              swRecentBooksService.reRender();
           };

           $scope.isPublication = function(bookItem){
              return publicationType.indexOf(bookItem.type) !== -1;
           };

          $scope.showDifficulty = swPublicationsService.showDifficulty;

          $scope.getLastReadTime = function(dateObj) {
              var readTime, currentTime  = moment(new Date().getTime());
              var lastReadTime = dateObj ? moment(dateObj) : currentTime;
              if (currentTime.diff(lastReadTime, 'days') > 31) {
                readTime =  lastReadTime.format(Context.parameters.defaultDateFormat);
              }
              else {
                readTime = lastReadTime.from(currentTime).replace('minutes', 'min');
              }
              return readTime;
           };
           
           $scope.isStudyCourse = function(item){
             return item.type === 'StudyCourse' || (item.type.replace(/\s/g,'') === 'StudyClass'/* && !item.coverId*/);
           };
           
            $scope.isAuthorInTitle = function(item) {
               return !swPublicationsService.isAuthorInBookTitle(item.author, item.name);
            };

       }]
   });
});