define([
   'module',
   'jquery',
   'swServiceFactory',
   'underscore',
   'text!./RecentBooks-header.html',
], function(module, $, swServiceFactory, _, lastBooksListPopupHeader) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         '$rootScope',
         'swApplicationToolbarService',
         'swOpenPublicationService',
         'swPopupService',
         'swPublicationsService',
         'swMaterialsService',
         'swStudyCourseService',
         'swUserPublicationService',
         'swLongRunningService',
         function (
            $rootScope,
            swApplicationToolbarService,
            swOpenPublicationService,
            swPopupService,
            swPublicationsService,
            swMaterialsService,
            swStudyCourseService,
            swUserPublicationService,
            swLongRunningService) {

            this.showPopup               = showPopup;
            this.reRender                = reRender;
            this.getRecentItemInfo       = getRecentItemInfo;
            this.getLastRecentItem       = getLastRecentItem;
            this.getRemoteRecentBooks    = getRemoteRecentBooks;
            this.getCurrentTab           = getCurrentTab;
            this.openRecentBook          = openRecentBook;
            this.hideAuthorBySizeElement = hideAuthorBySizeElement;

            var recentbooksPopup,
                $scope = $rootScope.$new();

            var addThumbnailUrl = function (bookItem) {
               if ( bookItem.cover ) {
                  bookItem.thumbnailUrl = swPublicationsService.getCoverPath(bookItem, 'small');
               }
               return bookItem;
            };

            function showPopup (element) {
               var _isEditor = swApplicationToolbarService.isEditor();
               if ( !recentbooksPopup || recentbooksPopup.isHidden() ) {
                  //swLongRunningService.start();
                  $scope.headerfn = {
                     selectRecentPublicationTab: function () {
                     }
                  };
                  $scope.headerconfig = {
                     tabNames            : {},
                     openedTab           : '',
                     isEditor            : false,
                     publicationList     : [],
                     studyActivitiesList : []
                  };
                   
                  //return swUserPublicationService.getRecentBooks()
                  //   .then(function (response) {
                         
                  var recentBooksData = swUserPublicationService.getRecentBooksData();
                        //swLongRunningService.end();
                        var publicationList = _.map(recentBooksData.books || [], addThumbnailUrl);
                        var studyActivitiesList = _.map(recentBooksData.studyActivities || [], addThumbnailUrl);
                        $scope.headerconfig.publicationList = publicationList;
                        $scope.headerconfig.studyActivitiesList = _isEditor ? [] : studyActivitiesList;
                        $scope.booklist = publicationList;
                        recentbooksPopup = swPopupService.show({
                           layout          : _layouter,
                           backdropVisible : true,
                           customClass     : 'recentbooksPopup',
                           scope           : $scope,
                           header          : lastBooksListPopupHeader,
                           content         : '<sw-recent-books headerfn="headerfn" headerconfig="headerconfig"></sw-recent-books>'
                        });
                        return recentbooksPopup;
                     //}, function () {
                     //   swLongRunningService.end();
                     //});
               }

               function _layouter () {
                  var clientRect = element.getClientRects()[0];
                  return {
                     of: {
                        clientRect: clientRect
                     },
                     margin: {
                        top: 50
                     }
                  };
               }
            }

            function reRender () {
               if ( recentbooksPopup ) {
                  recentbooksPopup.layout();
               }
            }

            function getRecentItemInfo(index) {
               var isLastOpenBook = false,
                   response = '',
                   lastBook = getLastRecentItem();
               if ( lastBook ) {
                  response = lastBook[index] || '';
                  isLastOpenBook = true;
               }
               return isLastOpenBook ? response : '';
            }

            function getLastRecentItem () {
               return swUserPublicationService.getLastRecentItem();
            }

            function getRemoteRecentBooks () {
               return swUserPublicationService.getRecentBooks();
            }

            function getCurrentTab () {
               var currentTab = swUserPublicationService.getLastRecentItem().type === 'StudyClass' ? 'StudyClass' : 'publication';
               return currentTab;
            }

            var openPublicationByType = {
               'Book'        : openBook,
               'StudyGuide'  : openStudyGuide,
               'StudyCourse' : openStudyCourse,
               'StudyClass'  : openStudyClass
            };

            function openRecentBook(bookItem) {
               var author = bookItem.author;
               var title = bookItem.name;
               if (bookItem.type === 'StudyClass') {
                  author = '';
               }
               swUserPublicationService.updateTitleLastRecentItem(title, author);
               if ( _.has(openPublicationByType, bookItem.type) ) {
                  openPublicationByType[bookItem.type](bookItem);
               }
            }

            var openPublication = function (bookItem) {
               swOpenPublicationService.openPublication(bookItem._id, _.get(bookItem, 'readingPosition.fragmentId', ''), {
                  reload        : true,
                  isStudyCourse : bookItem.type === 'StudyCourse',
                  type          : bookItem.type,
                  classId       : bookItem.classId
               }, true);
            };

            function openBook (bookItem) {
               var isEditor = swApplicationToolbarService.isEditor();
               var publicationParams = {
                  id   : bookItem._id,
                  type : bookItem.type
               };
               if ( isEditor ) {
                  swMaterialsService.updateMaterialsSet({}, publicationParams)
                     .then(function (resp) {
                        swOpenPublicationService.openPublication(resp.data);
                     });
               }
               else {
                  openPublication(bookItem);
               }
            }

            function openStudyGuide (bookItem) {
               openPublication(bookItem);
            }

            function openStudyCourse (bookItem) {
               var isEditor = swApplicationToolbarService.isEditor();
               if ( isEditor ) {
                  swStudyCourseService.editCourse(bookItem._id);
               }
               else {
                  swOpenPublicationService.beginUserStudy(bookItem._id, bookItem.readingPosition, {
                     isStudyCourse: true
                  });
               }
            }

            function openStudyClass (bookItem) {
               swOpenPublicationService.beginUserStudy(bookItem.currentStudyItemId, '', {
                  isStudyCourse : bookItem.publicationType === 'StudyCourse',
                  _classId      : bookItem.classId,
                  type          : 'StudyClass'
               });
            }

            var authorSize = 0;

            function hideAuthorBySizeElement (elementId, width, toolbarHeight) {
               var authorSelector = elementId + " span:nth-child(2)";
               if ( width >= authorSize && !$(authorSelector).is(':visible') ) {
                  $(authorSelector).show();
               }
               var elementHeight = $(elementId).height();
               if ( elementHeight > toolbarHeight ) {
                  authorSize = width - $(authorSelector).width();
                  $(authorSelector).hide();
               }
            }
         }]
   });
});
