define([
   'module',
   'underscore',
   'swComponentFactory',
   'ClientNodeContext',
   'text!./StudyPublication.html',
   'less!./StudyPublication.less'//,
   // 'css!framework/lib/reader_sdk'
], function(module, _, swComponentFactory, ClientNodeContext, template) {
   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      submachine : true,
      isolatedScope : {
         isEditor   : '@',
         readingApi : '='
      },
      controller : [
         '$q',
         '$scope',
         '$timeout',
         '$window',
         '$element',
         'swApplicationScroll',
         'swStickyService',
         'swApplicationToolbarService',
         'swReaderToolbarService',
         'swReaderService',
         'swThemeManager',
         'swReadModeSettingsService',
         'swPopupService',
         'swLayoutManager',
         'swUserPublicationService',
         'swOpenPublicationService',
         'swUserStudyService',
         'swStudyClassService',
         'swUnifiedSettingsService',
         'swVocabularyAssessmentService',
         'swDirectVocabularyService',
         'swStudyPublicationService',
         'swPublicationsService',
         'swAgentService',
         'swOfflineModeService',
      function(
         $q,
         $scope,
         $timeout,
         $window,
         $element,
         swApplicationScroll,
         swStickyService,
         swApplicationToolbarService,
         swReaderToolbarService,
         swReaderService,
         swThemeManager,
         swReadModeSettingsService,
         swPopupService,
         swLayoutManager,
         swUserPublicationService,
         swOpenPublicationService,
         swUserStudyService,
         swStudyClassService,
         swUnifiedSettingsService,
         swVocabularyAssessmentService,
         swDirectVocabularyService,
         swStudyPublicationService,
         swPublicationsService,
         swAgentService,
         swOfflineModeService) {
         var vm = $scope;

         vm.swSubmachine.configure({
            'Reader' : {
               uri : '/reader',
               history : false
            },
            'Extras' : {
               uri : '/extras',
               history : false
            },
            'AudioPlayer' : {
               uri : 'audio-player',
               history : false
            }
         });

         var extrasPopup     = null;
         var isEditor        = vm.isEditor === 'true';
         var readerData      = {};
         var isWideMedia     = _isWideMedia();
         var scrollOptionKeys    = _getScrollOptionKeys();
         var params          = vm.swSubmachine.context().confParams();

         vm.swApplicationScrollType = 'VIRTUAL';
         vm.isExtrasVisible         = isWideMedia && isEditor;

         vm.swInit   = _init;
         vm.swLayout = _layout;

         vm.swOnChangeApplicationScrollType = _onChangeScrollType;
         vm.publication = {
            /**
             *
             * @param {?Object} updateData
             */
            _update: function updatePublication(updateData) {
               // TODO: investigate using immutable objects
               // vm.publication = _.assign({}, this, updateData);
               $timeout(function() {
                  _.assign(vm.publication, updateData);
               });
            }
         };

         function _init () {
            vm.readingApi.returnToLibrary = _returnToLibrary;
            if ($window.cordova && $window.keepScreenOn) {
               $window.keepScreenOn.KeepScreenOn();
            }
            if (!swAgentService.isEnabled() && swOfflineModeService.isOffline()) { //isOflineFlag
               readerData = swStudyPublicationService.setReaderData(params);
               swOpenPublicationService.openPublication(readerData.publicationId);
               vm.extrasApi   = {};
            }
            else {
               fetchReaderData().then(function _onFetch(params) {
                   swApplicationToolbarService.setIsEditor(isEditor);
                   swReaderToolbarService.addOnExtrasToggleListener(onExtrasToggleListener);
                   swReaderToolbarService.setOpenClassInfoFn(onClassInfo);


                   readerData = swStudyPublicationService.setReaderData(params);
                   vm.extrasApi = {
                      isStudyCourse: params._studyCourseId,
                      isWideMedia: isWideMedia,
                      isTeacher: params.options && params.options.isTeacher,
                      isStudyClass: params._classId,
                      classId: readerData.classId
                   };
                   vm.readingApi = _.extend(vm.readingApi, {
                      isStudyCourse: !!vm.extrasApi.isStudyCourse,
                      isTeacher: !!vm.extrasApi.isTeacher,
                      classId: readerData.classId
                   });

                   if (readerData.classId) {
                      return swStudyClassService.getStudyClassInfo(readerData.classId).then(function (response) {
                         if (vm.extrasApi.isTeacher === undefined) {
                            vm.readingApi.isTeacher = response.data.userRole === 'Teacher';
                         }
                         swStudyClassService.setCurrentStudyClassInfo(response.data);
                         return updateUserPublicationData(params, readerData);
                      });
                   }
                   return updateUserPublicationData(params, readerData);
                })
                .catch(_returnToLibrary);
            }

            _.each(scrollOptionKeys, function(key) {
               swUnifiedSettingsService.addOnSettingsChangeListener('ScrollSettings', key, _onChangeScrollSetting);
            });
         }

         function updateUserPublicationData(params, readerData) {
            return updateUserPublication()
               .then(function _onUpdateUserStudy(details) {
                  vm.extrasApi.collectionId = details.collection;
                  vm.extrasApi.allowDiscussions = vm.readingApi.allowDiscussions = details.allowDiscussions;
                  if ( isEditor ) {
                     swOpenPublicationService.openPublication(params._id,
                        params.locator || _.get(details, 'readingPosition.fragmentId', ''), params.options);
                     vm.swSubmachine.start('Extras');
                  }
                  else {
                     swUserStudyService.initiatePublicationStudy(readerData.mode, readerData.publicationId, readerData.classId)
                         .then(function (response) {
                           return swStudyPublicationService.setCurrentItems(response.data);
                         })
                         .then(function (openParams) {
                            var id = params._id || openParams.id;
                            getPublicationInfo(id, params._type).then(function (_info) {
                               var _id = _info.currentStudyGuideId || _info.defaultStudyGuideId || openParams.id;
                               var _locator = params.locator || _.get(openParams, 'readingPosition.fragmentId', '');
                               openParams.vocabularyAssessments.reduce(function (promise) {
                                  return promise.then(_startAssessment);
                               }, $q.when(true));
                               var _options = _.defaults({
                                  reload      : false,
                                  readRange   : openParams.readRange,
                                  studyItemId : openParams.studyItemId,
                                  readingPosition : openParams.readingPosition
                               }, params.options);
                               //TODO: clarify case when locator set from outside and remove ||
                               swOpenPublicationService.openPublication(_id, _locator, _options);
                               swReaderService.setOpenPublicationNextFn(openPublicationNext);
                               swReaderService.setCheckPublicationNextFn(checkPublicationNext);
                            });
                     });
                  }
                  _initScrollListenerIfNeeded();
               });
         }

         function fetchReaderData() {
            var params = _.clone(vm.swSubmachine.context().confParams());
            var promise;

            if (_.has(params, '_extid')) {
               promise = swPublicationsService.getPublicationDetailsByExtId(params._extid);
            }
            else {
               promise = $q.all(params);
            }

            return promise.then(_processLocator);
         }

         function _processLocator(params) {
            var _params = vm.swSubmachine.context().confParams();
            params.locator = _params._locator ? '#' + _params._locator : _params.locator;
            return params;
         }

         function _layout (context) {
            var isChangeSize = _.chain(context.events).pick('resizing', 'orienting', 'initiating').values().any().value();

            if ( isChangeSize && !isMobileKeyboardOpened(context) && isViewPortChanged(context) ) {
               // sometimes recalculate LayoutManager passes after DOM-refresh
               // and we can't see Extas-block, so we detect isWideMedia in next digest
               $timeout(function() {
                  isWideMedia = _isWideMedia();
                  vm.extrasApi.isWideMedia = isWideMedia;
                  vm.isExtrasVisible = isWideMedia && isEditor;
                  onExtrasToggle(isWideMedia, true);
                  _.defer(_onScroll);
               });
            }
            else {
               var $extras = $element.children('.extras-popup');
               if ( $extras.length > 0 && swApplicationScroll.isUseTransform() ) {
                  $extras.css({
                     'height'    : _getExtrasHeight(),
                     'position'  : 'absolute'
                  });
               }
            }
         }

         function _initScrollListenerIfNeeded() {
            if (!swApplicationScroll.isUseTransform()) {
               return;
            }

            _getScroll().addListener(_onScroll);
         }

         function _onChangeScrollType() {
            _getScroll().removeListener(_onScroll);
            _initScrollListenerIfNeeded();
            _.result($scope, 'readingApi.onChangeScrollType');
         }

         function _onScroll() {
            var $extras = $element.children('.extras-popup');
            if ( $extras.length === 0 ) {
               return;
            }
            var scrollTop = _getScrollTop();
            $extras.css('transform', 'translateY(' + (scrollTop) + 'px)');
         }

         function _getScrollTop() {
            var st = _.result(_getScroll(), '_getScrollTop');
            return _.isNumber(st) ? st : _.result(swApplicationScroll, 'getScrollTop');
         }

         function _getScroll() {
            return swApplicationScroll.getScroll();
         }

         function _onInitExtras() {
            var $extras = $element.children('.extras-popup');
            if ( $extras.length > 0 && swApplicationScroll.isUseTransform() ) {
               $extras.css({
                  'position': 'absolute',
                  'height'  : _getExtrasHeight()
               });
               _onScroll();
            }
         }

         function _getExtrasHeight() {
            var top = swStickyService.getStickyHeightOver(_getScroll());
            var viewport = swLayoutManager.context().viewport;
            return viewport.height - top;
         }

         vm.swSubmachine.$on$start$enter = function () {
            var themeName = swReadModeSettingsService.getTheme();
            swThemeManager.activateTheme({value: themeName});
            swUnifiedSettingsService.addOnSettingsChangeListener('ReaderSettings', 'readingThemeName', swThemeManager.activateTheme);
            _.defer(_.defer, _onChangeScrollSetting);
         };

         vm.swSubmachine.$onAfterAnyEvent = function() {
            var context = vm.swSubmachine.context();
            if ( (context.event === 'onChangeLocator' || context.event === 'onChangeCollectionItem') && extrasPopup ) {
               extrasPopup.hide();
               extrasPopup = null;
            }
         };

         vm.swSubmachine.$on$end$enter = function () {
            if( $window.cordova && $window.keepScreenOn ) {
               $window.keepScreenOn.CancelKeepScreenOn();
            }
            swThemeManager.activateTheme();
            swReaderToolbarService.removeOnExtrasToggleListener(onExtrasToggleListener);
            swUnifiedSettingsService.removeOnSettingsChangeListener('ReaderSettings', 'readingThemeName', swThemeManager.activateTheme);

            _.each(scrollOptionKeys, function(key) {
               swUnifiedSettingsService.removeOnSettingsChangeListener('ScrollSettings', key, _onChangeScrollSetting);
            });

            _getScroll().removeListener(_onScroll);
            swApplicationScroll.changeOptions({ snapOnMomentum: _.identity });
         };

         function getLayouter(element) {
            return function() {
               var layout = {
                  my: 'CC',
                  at: 'CC',
                  arrow: true
               };
               if (element) {
                  layout = {
                     of : {
                        clientRect: element.getClientRects()[0]
                     },
                     my: 'CT',
                     at: 'CB',
                     arrow: true
                  };
               }
               return layout;
            };
         }

         function onExtrasToggleListener (options) {
            if ( options.visible && !options.close ) {
               vm.enforceTOC = false;
               vm.extrasApi.isFromClassEntered = options.fromClass;
               if ( !isWideMedia ) {
                  extrasPopup = swPopupService.show({
                     layout: getLayouter(options.element),
                     margin: {
                        top: 44
                     },
                     customClass: 'extras-popup-dialog',
                     scope: vm,
                     template: '<sw-extras publication="publication" extras-api="extrasApi"></sw-extras>',
                     backdropVisible: true
                  });
                  extrasPopup.promise.then(function() {
                     onExtrasToggle(false, true);
                  });
               }
               else if ( !extrasPopup && !vm.isExtrasVisible ) {
                  vm.isExtrasVisible = true;
                  vm.swSubmachine.start('Extras');
                  swLayoutManager.layout('resizingPublication');
                  _.defer(_onInitExtras);
               }
               else {
                  vm.isExtrasVisible = false;
                  onExtrasToggle(false, true);
                  swLayoutManager.layout('resizingPublication');
               }
            }
            if ( options.close && extrasPopup ) {
               extrasPopup.hide();
               extrasPopup = null;
            }
         }

         function openPublicationNext() {
            if (checkPublicationNext()) {
               swStudyPublicationService.switchItem().then(function(openParams) {
                  var locator = _.get(openParams, 'readingPosition.fragmentId', '');
                  openParams.vocabularyAssessments.reduce(function (promise) {
                     return promise.then(_startAssessment);
                  }, $q.when(true));
                  swOpenPublicationService.openPublication(openParams.id, locator, {
                     reload: false,
                     readRange: openParams.readRange,
                     studyItemId: openParams.studyItemId,
                     readingPosition: openParams.readingPosition
                  });
               });
            }
         }

         var checkPublicationNext = swStudyPublicationService.hasNextItem; //?

         function onClassInfo () {
            var params = vm.swSubmachine.context().confParams();
            if (params._classId) {
               swStudyClassService.resumeCourse({
                  classId : params._classId,
                  isInviteVisible : false
               });
            }
         }

         function updateUserPublication() {
            var readerData = swStudyPublicationService.getReaderData();
            var publicationType = readerData.mode === 'Class' ? 'StudyClass' : 'Book';
            if (isEditor) {
               publicationType = 'StudyGuide';
            }
            return swUserPublicationService.updateUserPublication({
               publicationId      : readerData.mode === 'Class' ? readerData.classId : readerData.publicationId,
               publicationType    : publicationType,
               lastOpenedAt       : _.now(),
               personal           : true
            });
         }

         function _isWideMedia () {
            return !!swLayoutManager.context().media.wide;
         }

         function _onChangeScrollSetting() {
            var settings = swUnifiedSettingsService.getGroup('ScrollSettings');
            var inertialScrollingSpeed = Math.max(+settings.inertialScrollingSpeed, 1);
            var options = {
               useMomentum : settings.inertialScrolling,
               momentumDeceleration : 1 / (25 * inertialScrollingSpeed),
               useInternalScrolling: settings.textScrolling,
               scrollEdgeWidth : (settings.sideScrolling || settings.sideTapping) ? 100 : 0,
               scrollTapRate: settings.sideTapping ? +settings.pageLengthShift : 0,
               tapMode: settings.tapMode === 'one' ? 'lr' : 'tb',
               snapOnMomentum: settings.snapToScrollBorder ? _snapOnMomentum : _.identity
            };
            swApplicationScroll.changeOptions(options);
            $element.toggleClass('sw-vscroll-edge-on', settings.sideScrolling);
         }

         function _snapOnMomentum(destination, currentScrollTop) {
            var toUp = currentScrollTop > destination;
            var $wrapper = $element.find('.nota-wrapper');
            var wrapperOffset = $wrapper[0].offsetTop;
            var children = _.toArray($wrapper.children('[id^=para_]'));
            var cond = function(el) {
               return (el.offsetTop + wrapperOffset) < destination;
            };

            if (toUp) {
               cond = _.negate(cond);
            }

            var el = _[toUp ? 'find' : 'findLast'](children, cond);
            // if `destination` is outside scrollable element
            el = el || _[toUp ? 'first' : 'last'](children);
            return el.offsetTop + wrapperOffset;
         }

         function getPublicationInfo ( _id, _type ) {
            var info = {};
            switch ( _type ) {
               case 'Book':
               case 'StudyClass':
                  info = swPublicationsService.getBookInfo(_id)
                      .then(function (_response) {
                         return _response.data;
                      });
                  break;
               default:
                  info = $q.all({});
                  break;
            }
            return info;
         }

         function isViewPortChanged (_context) {
            return _context.oldViewport.width !== _context.viewport.width ||
                   _context.oldViewport.height !== _context.viewport.height;
         }

         function isMobileKeyboardOpened (_context) {
            return ClientNodeContext.platformType === 'Mobile' &&
                   _context.oldViewport.width === _context.viewport.width &&
                   _context.oldViewport.height > _context.viewport.height;
         }

         function _startAssessment () {
            return swVocabularyAssessmentService.startAssessment(swDirectVocabularyService, {
               wait: true
            });
         }

         function onExtrasToggle (_isVisible, _isClose) {
            swReaderToolbarService.onExtrasToggle({
               visible : !!_isVisible,
               close   : !!_isClose
            });
         }

         function _returnToLibrary () {
            vm.swSubmachine.back();
         }
      }]
   });

   function _getScrollOptionKeys() {
      return [
         'viewScrollBorder',
         'snapToScrollBorder',
         'inertialScrolling',
         'inertialScrollingSpeed',
         'textScrolling',
         'sideScrolling',
         'sideTapping',
         'pageLengthShift',
         'tapMode',
         'audioAutoScrolling',
         'readingPosition',
         'keepOn'
      ];
   }
});
