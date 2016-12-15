define([
   'swComponentFactory',
   'module',
   'underscore',
   'text!./EditCourseBookItem.html',
   'less!./EditCourseBookItem'
], function (swComponentFactory, module, _, template) {

   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine: true,
      isolatedScope: {
         readingApi: '=',
         editMode: '='
      },
      controller: [
         '$element',
         '$scope',
         '$q',
         'swOpenPublicationService',
         'swPublicationsService',
         'swDevelopStudyCourseService',
         'swEditCourseBookItemService',
         'swStudyCourseService',
         'swScrollFactory',
         function (
            $element,
            $scope,
            $q,
            swOpenPublicationService,
            swPublicationsService,
            swDevelopStudyCourseService,
            swEditCourseBookItemService,
            swStudyCourseService,
            swScrollFactory) {

            var relatedPublication,
                deferOpenPublication,
                deferGetRelatedPublications,
                editablePublicationInfoFields = [
                    'name',
                    'description'
                ],
                defaultReadingTime = 0,
                defaultDifficulty = 0;

            $scope.relatedPublications = [];

            $scope.publication = {};
            $scope.checkboxes = [];

            $scope.toc = { active: -1 };

            $scope.editMode.disabled = true;
            $scope.descriptionExpanded = false;

            swEditCourseBookItemService.setSelectionUpdate(selectionUpdate);

            $scope.swInit = function () {
               var path = $scope.editMode.publication.paragraphId ? '#' + $scope.editMode.publication.paragraphId : undefined;
               deferGetRelatedPublications = swPublicationsService.getBookInfo($scope.editMode.publicationId);
               deferOpenPublication = swOpenPublicationService.openPublication($scope.editMode.publicationId, path,
                   {
                      notLoadNota: true,
                      range: {
                         start: $scope.editMode.publication.paragraphId,
                         end: $scope.editMode.publication.finishingParagraphId
                      },
                      reload: false,
                      isDevelopStudyCourse: true
                   });


               $q.all([deferGetRelatedPublications, deferOpenPublication])
               .then(function (response) {
                  function tocReducer(plainToc, el) {
                    var children = el.children;
                    delete el.children;
                    return plainToc.concat(el, children.reduce(tocReducer, []));
                  }
                  $scope.publication = response[0].data.book;
                  defaultDifficulty = $scope.publication.difficulty;
                  defaultReadingTime = $scope.publication.readingTime;
                  $scope.tocHtml = (response[0].data.tableOfContents || []).reduce(tocReducer, []);
                  $scope.relatedPublications = response[0].data;
                  relatedPublication = {
                    studyGuideId: $scope.editMode.publication.studyGuideId,
                    studyGuideAuthor : $scope.editMode.publication.studyGuideAuthor,
                    studyGuideName  : $scope.editMode.publication.studyGuideName
                  };
                  if(relatedPublication.studyGuideId){
                    _.each($scope.relatedPublications, function (publ) {
                      if(publ.id === relatedPublication.studyGuideId){
                        relatedPublication.studyGuideAuthor = publ.author;
                        relatedPublication.studyGuideName = publ.name;
                        $scope.checkboxes.push({
                          checked  : true,
                          disabled : false
                        });
                      }
                      else{
                        $scope.checkboxes.push({
                          checked  : false,
                          disabled : true
                        });
                      }
                    });
                  }
                  else{
                    _.each($scope.relatedPublications, function () {
                      $scope.checkboxes.push({
                        checked  : false,
                        disabled : false
                      });
                    });
                  }

                  $scope.toc.active = 0;

                   // debugger;//service client - result is not used
                   var currentPublicationId = $scope.editMode.getCurrentPublicationId($scope.editMode.publication);
                   return $scope.editMode.publication.paragraphId ?
                      swStudyCourseService.calcBookRangeProperties(currentPublicationId, {
                      start: $scope.editMode.publication.paragraphId,
                      end: $scope.editMode.publication.finishingParagraphId
               })
                      :
                      $q.when();
               })
              .then(fillSelectionProperties, cleanSelectionProperties);
            };

            $scope.showDifficulty = swPublicationsService.showDifficulty;

            $scope.clearSelection = function () {
               swEditCourseBookItemService.clearSelection();
            };

            $scope.backTo = function () {
               goToParagraph($scope.editMode.publication.paragraphId);
            };
            $scope.forwardTo = function () {
               goToParagraph($scope.editMode.publication.finishingParagraphId);
            };

            $scope.navigateBack = function () {
               if ($scope.editMode.publication.start) {
                  _.extend($scope.editMode.publication, {
                     start : $scope.editMode.publication.start,
                     end   : $scope.editMode.publication.end
                  });
               }

               $scope.editMode.active = false;
               $scope.editMode.publication.studyGuideId    = relatedPublication.studyGuideId;
               $scope.editMode.publication.studyGuideAuthor = relatedPublication.studyGuideAuthor;
               $scope.editMode.publication.studyGuideName  = relatedPublication.studyGuideName;

               fillEmptyPublicationInfoFields();

               swDevelopStudyCourseService.editItem({
                  publication : $scope.editMode.publication,
                  index       : $scope.editMode.index
               });
            };

            var editData = {};
            $scope.editData = {
              description : $scope.editMode.publication.description
            };

            var edit = function(){
              editData = _.clone($scope.editMode.publication);
              $scope.editMode.disabled = false;
              var scroll = swScrollFactory.getScroll($element.find('.course-item-block'));
              scroll.scrollIntoViewIfNeeded($element.find('.book-item-block-title'));
            };

            var save = function() {
              $scope.editMode.publication.description = $scope.editData.description;
              $scope.editMode.disabled = true;
            };

            var cancel = function() {
              $scope.editMode.publication = editData;
              $scope.editMode.disabled = true;
            };

            $scope.editConfig = {
              edit              : edit,
              save              : save,
              cancel            : cancel
            };

            $scope.selectRelatedPublication = function (index) {
                $scope.checkboxes = _.map($scope.checkboxes, function(checkboxe, checkboxeIndex){
                  checkboxe.checked = checkboxeIndex === index;
                  return checkboxe;
                });
                relatedPublication = {
                  studyGuideId: $scope.relatedPublications[index].id,
                  studyGuideAuthor: $scope.relatedPublications[index].author,
                  studyGuideName: $scope.relatedPublications[index].name,
                  readingTime: $scope.relatedPublications[index].readingTime
                };

               $scope.editMode.publication.studyGuideId    = relatedPublication.studyGuideId;
               $scope.editMode.publication.studyGuideAuthor = relatedPublication.studyGuideAuthor;
               $scope.editMode.publication.studyGuideName  = relatedPublication.studyGuideName;
               $scope.editMode.publication.readingTime  = relatedPublication.readingTime;
               for (var i = 0; i < $scope.checkboxes.length; i++) {
                  $scope.checkboxes[i].disabled = ( index !== i && $scope.checkboxes[index].checked ) || false;
               }
            };

            $scope.getCover = function (publication)
            {
               return swPublicationsService.getCoverPath(publication, 'large', '#');
            };

            $scope.toggleDescriptionView = function () {
               if (!$scope.editMode.disabled) {
                  return false;
               }
               $scope.descriptionExpanded = !$scope.descriptionExpanded;
            };

            $scope.goToLocator = function (item, index) {
               goToParagraph(item.id);
               $scope.toc.active = index;
            };

            $scope.showList = true;
            $scope.showStudyGuideList = function(){
              $scope.showList = $scope.showList ? false : true;
            };
            $scope.showContentList = true;
            $scope.showContents = function(){
              $scope.showContentList = $scope.showContentList ? false : true;
            };


            $scope.isCurrentRelatedPublications = function(publication){
              return relatedPublication && relatedPublication.studyGuideId === publication.id;
            };

            $scope.isAuthorInTitle = function(publication) {
               return !swPublicationsService.isAuthorInBookTitle(publication.author, publication.name);
            };


            function goToParagraph(para) {
               var _path = para ? '#' + para : undefined;
               swOpenPublicationService.openPublication($scope.editMode.publicationId, _path, {
                _studyCourseId :$scope.editMode.studyCourseId,
                reload: false
              });
            }

            function selectionUpdate(data) {
               $scope.editMode.publication.paragraphId = data.start;
               $scope.editMode.publication.finishingParagraphId = data.end;

               if (data.start) {
                  // debugger;//service client - NOT TESTED
                  var currentPublicationId = $scope.editMode.getCurrentPublicationId($scope.editMode.publication);
                  swStudyCourseService.calcBookRangeProperties(currentPublicationId, {
                    start : data.start,
                    end   : data.end
                 })
                 .then(fillSelectionProperties, cleanSelectionProperties);
               }
               else {
                  cleanSelectionProperties();
               }
            }

            function fillSelectionProperties(response) {
               if(response) {
              $scope.editMode.publication.readingTime = response.data.readingTime;
              $scope.editMode.publication.difficulty  = response.data.difficulty;
            }
            }

            function cleanSelectionProperties() {
              $scope.editMode.publication.readingTime = defaultReadingTime;
              $scope.editMode.publication.difficulty  = defaultDifficulty;
            }

            function fillEmptyPublicationInfoFields ()
            {
               var regExp = /^\s*$/;

               editablePublicationInfoFields.forEach(function(name) {
                  if (regExp.test($scope.editMode.publication[name]))
                  {
                     $scope.editMode.publication[name] = $scope.publication[name];
                  }
               });
            }
         }]
   });
});