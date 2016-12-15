define([
   'module',
   'Context',
   'underscore',
   'swComponentFactory',
   'text!./Publication.html',
   'less!./Publication.less'
], function (module, Context, _, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         studyProject      : '=',
         wizardApi         : '=',
         relatedViewConfig : '='
      },
      controller: [
         '$q',
         'swPublicationsService',
         'swScrollFactory',
         'swLazyLoadingHelper',
         'swI18nService',
         function (
            $q,
            swPublicationsService,
            swScrollFactory,
            swLazyLoadingHelper,
            swI18nService,

            /* jshint unused: true */
            swComponentAugmenter,
            $scope,
            $element) {
            var vm = $scope;
            var scroll,
                PUBLICATIONS_SET = 0,
                PAGE_SIZE        = 25,
                currentLang      = Context.parameters.defaultLanguage;

            vm.activePublication       = -1;
            vm.publications            = [];
            vm.detailedPublicationInfo = {};
            vm.isCollectionExpanded    = false;
            vm.relatedViewConfig       = {
               currentSelect : true,
               persist       : false,
               selectedId    : vm.studyProject.publication && vm.studyProject.publication.selectedId
            };

            vm.publicationsFilter      = {
               text: ''
            };

            vm.swInit                = _init;
            vm.swDestroy             = _destroy;
            vm.swLayout              = swLayout;
            vm.getCover              = getCover;
            vm.getTotalEstimatedTime = getTotalEstimatedTime;
            vm.addToSelected         = addToSelected;
            vm.isRelatedPublications = isRelatedPublications;
            vm.isStudyCourse         = isStudyCourse;
            vm.showDifficulty        = swPublicationsService.showDifficulty;
            vm.collapseCollection    = collapseCollection;
            vm.onFiltering           = _searchPublications;
            vm.isAuthorInTitle       = isAuthorInTitle;

            function getTotalEstimatedTime () {
               return swI18nService.getResource('CreateStudyProject.wizard.step2.totalEstimatedTime', vm.studyProject.publication);
            }

            function isAuthorInTitle(publication) {
               return publication && !swPublicationsService.isAuthorInBookTitle(publication.author, publication.name, publication.language);
            }

            function _init () {
               vm.wizardApi.debValid();
               vm.wizardApi.getProgress();
               _.defer(function () {
                  scroll = swScrollFactory.getScroll($element.find('.infinity-book-list'));
                  if ( vm.studyProject.publication ) {
                     getDetailedPublicationInfo(vm.studyProject.publication);
                  }
                  _searchPublications();
               });
            }

            function getCover (publication) {
               return swPublicationsService.getCoverPath(publication, 'small', '#');
            }

            function _destroy () {
               _setPublicationData();
               swLazyLoadingHelper.unregister(scroll);
            }

            function _setPublicationData () {
               if ( !vm.studyProject.publication ) {
                  return;
               }
               vm.studyProject.publication.selectedId = vm.relatedViewConfig.selectedId || vm.studyProject.publication._id || vm.studyProject.publication.id; //check "_id" or "id"
            }

            function addToSelected (index) {
               var selectedPublication = vm.publications[index];
               vm.detailedPublicationInfo = {};

               if ( selectedPublication.type === 'Collection' ) {
                  expandCollection(selectedPublication.id);
                  vm.collectionName = selectedPublication.name;
                  return;
               }
               vm.activePublication = index;
               vm.wizardApi.debValid();
               vm.studyProject.publication = selectedPublication;
               getDetailedPublicationInfo(selectedPublication);
            }

            function isRelatedPublications () {
               return !_.isEmpty(vm.detailedPublicationInfo) && vm.detailedPublicationInfo.relatedStudyGuides.length > 0;
            }

            function isStudyCourse (publication) {
               return publication && publication.type === 'StudyCourse';
            }

            function collapseCollection () {
               vm.isCollectionExpanded = false;
               _morePublication();
            }

            function capitalizeFirstLetter (string) {
               return string && string.charAt(0).toUpperCase() + string.slice(1);
            }

            function _searchPublications () {
               PUBLICATIONS_SET = 0;
               vm.publications = [];
               swLazyLoadingHelper.unregister(scroll);
               swLazyLoadingHelper.register(scroll, {
                  next: _morePublication,
                  rift: 25
               });
            }

            function _morePublication () {
               var text = vm.publicationsFilter.text;
               PUBLICATIONS_SET += PAGE_SIZE;
               var size = PUBLICATIONS_SET;
               return swPublicationsService.searchPublications(text, size, currentLang, '', '').then(_onPublicationsLoaded);
            }

            function _onPublicationsLoaded(response) {
               vm.publications = response;
               if ( vm.studyProject.publication ) {
                  var currentPublication = _.findWhere(vm.publications, {id: vm.studyProject.publication.id}) || {};
                  vm.activePublication = vm.publications.indexOf(currentPublication);
               }
               vm.publications = _.filter(vm.publications, function (publication) {
                  return publication.type !== 'StudyGuide' && _.extend(publication, {
                     category: capitalizeFirstLetter(publication.category)
                  });
               });

               if ( PUBLICATIONS_SET > vm.publications.length ) {
                  return $q.reject();
               }
            }

            function expandCollection (collectionId) {
               vm.isCollectionExpanded = true;
               swPublicationsService.searchCollectionItems(collectionId).then(_onPublicationsLoaded);
            }

            function swLayout (ctx) {
               if (ctx.events.resizing) {
                  $element.find('.sw-scrollable').trigger('sizeChange');
               }
            }

            function getDetailedPublicationInfo (_publication) {
               if (!_.isObject(_publication)) {
                  return;
               }
               var id = _publication.id || _publication._id;
               switch (_publication.type) {
                  case 'Book':
                     swPublicationsService.getBookInfo(id)
                        .then(function (_bookInfo) {
                           vm.detailedPublicationInfo = _bookInfo.data;
                        });
                     break;
                  default:
                     vm.detailedPublicationInfo = {};
                     break;
               }
            }
         }
      ]
   });
});