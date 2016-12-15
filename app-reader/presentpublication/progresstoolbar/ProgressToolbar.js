define([
   'module',
   'jquery',
   'underscore',
   'swComponentFactory',
   'publication/locator',
   'publication/reading-position',
   'text!./ProgressToolbar.html',
   'less!./ProgressToolbar.less'
], function(module, $, _, swComponentFactory, Locator, ReadingPosition, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: true,
      controller: [
         '$scope',
         '$element',
         '$timeout',
         'swPopup',
         'swLayoutManager',
         'swApplicationScroll',
         'swContentProvider',
         'swFeatureDetector',
         'swOpenPublicationService',
         'swProgressToolbarService',
         'swApplicationToolbarService',
         'swPublicationAudioManager',
         'swStudyPublicationService',
         function (
            $scope,
            $element,
            $timeout,
            swPopup,
            swLayoutManager,
            swApplicationScroll,
            swContentProvider,
            swFeatureDetector,
            swOpenPublicationService,
            swProgressToolbarService,
            swApplicationToolbarService,
            swPublicationAudioManager,
            swStudyPublicationService
         ) {

            $scope.showToolbar   = swApplicationToolbarService.showToolbarImmidiatly;
            $scope.hideToolbarDelayed   = swApplicationToolbarService.hideToolbarDelayed;
            $scope.toggleToolbar = function ($event) {
               $event.stopPropagation();
               swApplicationToolbarService.toggleToolbar();
            };

            function detectLeftButton(event) {
               if ('buttons' in event) {
                  return event.buttons === 1;
               }
               else if ('which' in event) {
                  return event.which === 1;
               }
               else {
                  return event.button === 1;
               }
            }

            var classNames = {
               container: 'sw-progress-toolbar-container',
               chapter: 'sw-progress-toolbar-chapter',
               position: 'sw-progress-toolbar-reading-position',
               positionMarker: 'sw-progress-toolbar-reading-position-marker',
               currentPosition: 'sw-progress-toolbar-current-position',
               onPositionMarker: 'sw-progress-toolbar-reading-position-same',
               materialsMarker: 'sw-progress-toolbar-materials-marker',
               buttons: 'sw-progress-toolbar-button',
               dragInProgress: 'sw-progress-toolbar-in-progress',
               audioButton: 'audio',
               readingPositionButton: 'reading-position',
               popupButtons: 'sw-progress-toolbar-popup-buttons',
               popupRestoreRidingPosition: 'restore-reading-position',
               popupResetRidingPosition: 'reset-reading-position'
            };

            var bookId = '';
            var $parentEl = $element.parent();
            var $container = $element.find('.' + classNames.container);
            var $currentPosition;
            var currentParagraph = '';
            var currentLocator = null;
            var readingPosition = null;
            var isFirstPage = false;
            var isLastPage = false;
            var isOpenFromToolbar = false;
            var isEditor = swApplicationToolbarService.isEditor();

            var data = {
               paragraphs: [],
               paragraphsMap: {},
               materials: {}
            };

            $scope.audioButtonTooltip = {
               text: 'ProgressToolbar.AudioButton.Tooltip',
               layout: {
                  my: 'CB',
                  at: 'CT',
                  margin: 10,
                  collision: {rotate: false}
               }
            };

            var oldWidth;
            var oldHeight;
            var isToolbarVisible  = true;
            var isDataInitialized = false;
            swLayoutManager.register({
               id: $scope.$id,
               layout: function (context) {
                  if (context.events.scrolling && _popup && !_popup.isHidden() && popupLayoutSettings && $container.length) {
                     var newOffset = $container.offset().top + swApplicationScroll.getScrollTop();
                     if (newOffset !== popupLayoutSettings.clientY) {
                        popupLayoutSettings.clientY = newOffset;
                        _popup.layout();
                     }
                  }

                  if ($parentEl[0].offsetWidth !== oldWidth) {
                     _changeLayout();
                     oldWidth = $parentEl[0].offsetWidth;
                  }

                  if (swFeatureDetector.isTouchInput() && context.viewport.height !== oldHeight) {
                     if (!context.events.orienting) {
                        isToolbarVisible = !oldHeight || oldHeight <= context.viewport.height + 100; // magic number which compensate size of the toolbar in mobile chrome
                        showHideToolbar(isToolbarVisible && isDataInitialized);
                     }
                     oldHeight = context.viewport.height;
                  }
               }
            });

            function _changeLayout() {
               $element.css({left: 0, right:  $parentEl.width() - $parentEl.innerWidth()});
               updatePopupButtonsLayout();
            }

            function _findChapter(direction) {
               var currentIndex = data.paragraphsMap[currentParagraph];
               for (var i = currentIndex + direction; i >= 0 && i < data.paragraphs.length; i += direction) {
                  if (data.paragraphs[i].isChapter) {
                     currentIndex = i;
                     break;
                  }
               }
               return currentIndex;
            }

            function _stickCurrentAndMark() {
               var $marker = $container.find('.' + classNames.positionMarker);
               if (!$marker.length) {
                  return clientX;
               }
               var markerOffsetLeft = $marker.offset().left;
               var markerRange = [markerOffsetLeft, markerOffsetLeft + $marker.width()];
               var currentWidth = $currentPosition.width() / 2;
               var currentRange = [clientX - currentWidth, clientX + currentWidth];
               var x = clientX;
               if ((currentRange[0] >= markerRange[0] || currentRange[1] >= markerRange[0]) && currentRange[0] <= markerRange[1]) {
                  x = markerRange[0] + (markerRange[1] - markerRange[0]) / 2;
               }
               return x;
            }

            function _initEventHandlers() {
               $element.on('click', function (e) {
                  if ($scope.isToolbarHide) {
                     return;
                  }
                  var $target = $(e.target);
                  var $buttons = $target.closest('.' + classNames.buttons + ', .' + classNames.popupButtons);
                  if ($buttons.length) {
                     if ($buttons.hasClass(classNames.readingPositionButton) || $buttons.hasClass(classNames.popupRestoreRidingPosition)) {
                        var rp = ReadingPosition.getReadingPosition();
                        if (rp && rp.prefixedParagraphId) {
                           openParagraph(rp.prefixedParagraphId, false);
                        }
                        return;
                     }
                     if ($buttons.hasClass(classNames.popupResetRidingPosition)) {
                        resetReadingPosition();
                        return;
                     }
                     if ($buttons.hasClass(classNames.audioButton)) {
                        swPublicationAudioManager.goToAudio();
                        return;
                     }
                     var index = _findChapter(($buttons.hasClass('next') ? 1 : -1));

                     if (data.paragraphs[index]) {
                        openParagraph(data.paragraphs[index].id);
                     }
                  }
                  else if ($target.hasClass(classNames.positionMarker)) {
                     openParagraph(readingPosition.toJSON());
                  }
                  else if (swFeatureDetector.isTouchInput()) {
                     return;
                  }
                  else if ($target.hasClass(classNames.chapter) || $target.hasClass(classNames.materialsMarker)) {
                     openParagraph($target.attr('data-para-id'));
                  }
                  else {
                     if (e.clientX && !isMouseMove) {
                        openClosestParaByPoint(e.clientX);
                     }
                  }
               });

               function _isReadingPositionDraggable(el) {
                  return $(el).hasClass(classNames.positionMarker) && !$(el).hasClass(classNames.onPositionMarker);
               }

               var $body = $('body');
               var addDocumentEvent = _.noop;
               var removeDocumentEvent = _.noop;
               var togglePositionMarkerOnce = _.noop;
               if (swFeatureDetector.isDesktop()) {
                  var mouseMove = function (e) {
                     e.preventDefault();
                     e.stopPropagation();

                     if (detectLeftButton(e)) {
                        togglePositionMarkerOnce();
                        isMouseMove = true;
                     }
                     else {
                        mouseUp(e);
                        return;
                     }

                     showTooltip(e, isMouseDown);
                  };

                  var mouseUp = function () {
                     hidePopup();
                     hideToolbarDelayed();
                     removeDocumentEvent();
                     $element.removeClass(classNames.dragInProgress);
                     isMouseDown = false;
                     if (isMouseMove) {
                        openClosestParaByPoint(_stickCurrentAndMark());
                     }
                  };

                  addDocumentEvent = function () {
                     $body.on('mousemove', mouseMove);
                     $body.on('mouseup', mouseUp);
                  };

                  removeDocumentEvent = function () {
                     $body.off('mousemove', mouseMove);
                     $body.off('mouseup', mouseUp);
                  };

                  $container.on('mousedown', function (e) {
                     if (_isReadingPositionDraggable(e.target)) {
                        return;
                     }
                     togglePositionMarkerOnce = _.once(togglePositionMarker);
                     addDocumentEvent();
                     isMouseDown = true;
                     isMouseMove = false;
                     $element.addClass(classNames.dragInProgress);
                  });

                  $container.on('mousemove', function (e) {
                     if (!isMouseDown) {
                        showTooltip(e, false);
                     }
                  });

                  $container.on('mouseleave', function () {
                     if (!isMouseDown) {
                        hidePopup();
                        hideToolbarDelayed();
                     }
                  });
               }
               else {
                  var isMoved = false;
                  var throttled = _.throttle(showTooltip, 35);
                  var touchMove = function (e) {
                     e.stopPropagation();
                     e.preventDefault();
                     if (inProgress) {
                        togglePositionMarkerOnce();
                        isMoved = true;
                        throttled(e, true);
                     }
                  };
                  var touchEnd = function (e) {
                     hidePopup();
                     hideToolbarDelayed();
                     if (inProgress && clientX && isMoved) {
                        e.stopPropagation();
                        openClosestParaByPoint(_stickCurrentAndMark());
                     }
                     inProgress = false;
                     isMoved = false;
                  };

                  addDocumentEvent = function () {
                     $body.on('touchmove', touchMove);
                     $body.on('touchend touchcancel', touchEnd);
                  };

                  removeDocumentEvent = function () {
                     $body.off('touchmove', touchMove);
                     $body.off('touchend touchcancel', touchEnd);
                  };

                  $container.on('touchstart', function (e) {
                     if (_isReadingPositionDraggable(e.target)) {
                        return;
                     }
                     togglePositionMarkerOnce = _.once(togglePositionMarker);
                     inProgress = true;
                  });

                  $container.on('touchmove', touchMove);

                  $container.on('touchend touchcancel', touchEnd);
               }
            }

            var _popup;
            var clientX = 0;
            var inProgress = false;
            var isMouseMove = false;
            var isMouseDown = false;
            var oldClientX;
            var popupLayoutSettings = {data: {}};
            function showTooltip(e, moveCurrentMarker) {
               var $elTarget = $(e.target);
               var content;
               if ($elTarget.hasClass(classNames.chapter)) {
                  content = data.paragraphs[data.paragraphsMap[$elTarget.attr('data-para-id')]].name;
               }
               if ($elTarget.hasClass(classNames.materialsMarker)) {
                  content = getMaterialInfo(data.materials[$elTarget.attr('data-para-id')]);
               }

               var _containerOffset = $container.offset();
               var _containerWidth = $container.width();
               var eventClientX = e.clientX ? e.clientX : e.originalEvent.touches ? e.originalEvent.touches[0].clientX : 0;

               if ($elTarget.hasClass(classNames.positionMarker) && readingPosition) {
                  content = data.paragraphs[data.paragraphsMap[readingPosition.prefixedParagraphId]].name;
                  eventClientX = $elTarget.offset().left + $elTarget.outerWidth() / 2;
               }

               clientX = Math.floor(eventClientX);

               if (oldClientX === clientX || Math.abs(oldClientX - clientX) < 3) {
                  return;
               }
               if (clientX < _containerOffset.left) {
                  clientX = _containerOffset.left;
               }
               if (clientX >= _containerWidth + _containerOffset.left) {
                  clientX = _containerWidth + _containerOffset.left;
               }

               oldClientX = clientX;

               if (moveCurrentMarker) {
                  $currentPosition.css({left: clientX - _containerOffset.left});
                  var stick = _stickCurrentAndMark();
                  if (stick !== clientX) {
                     togglePositionMarker(true);
                  }
                  else {
                     togglePositionMarker(false);
                  }
               }

               $timeout(function () {
                  if (!data.paragraphs || !data.paragraphs.length) {
                     return;
                  }
                  popupLayoutSettings.data.tooltip = content || data.paragraphs[getClosestIndex(clientX)].name;
                  popupLayoutSettings.clientX = clientX;
                  popupLayoutSettings.clientY = _containerOffset.top + swApplicationScroll.getScrollTop();
                  if (_popup && !_popup.isHidden()) {
                     _popup.layoutImmediately();
                  }
                  else {
                     _popup = showPopup();
                  }
               });
            }

            function showPopup() {
               return swPopup.show({
                  extendScope: popupLayoutSettings,
                  modal: false,
                  requestFocus: false,
                  backdropEvents: true,
                  customClass: 'sw-tooltip sw-progress-toolbar-popup',
                  content: '<div>{{data.tooltip}}</div>',
                  layout: {
                     arrow: true,
                     my: 'CB',
                     at: 'CT',
                     of: popupLayoutSettings,
                     debounce: 0,
                     collision: {
                        rotate: false
                     }
                  }
               });
            }

            function hidePopup() {
               if (_popup && !_popup.isHidden()) {
                  _popup.hide(null);
               }
            }

            function hideToolbarDelayed() {
               $timeout(function () {
                  $scope.hideToolbarDelayed();
               });
            }

            function showHideToolbar(isVisible) {
               $element.toggle(Boolean(isVisible));
            }

            $scope.swInit = function () {
               _initEventHandlers();
               _changeLayout();
               $container.addClass('sw-popup-backdrop-events-allowed');
               swContentProvider.addOnPublicationLoadListener(init);
               swContentProvider.addOnExercisesChangeListener(materialsChangeListener);
               swProgressToolbarService.addOnPositionChangeListener(updateCurrentPosition);
               swApplicationToolbarService.addOnApplicationToolbarToggleListener(changeToolbarLayout);
               swPublicationAudioManager.addOnBoundaryListener(changeAudioLocator);
            };

            function init (contentSummary, details) {
               var currentStudyItem = swStudyPublicationService.getCurrentStudyItem();
               var readingProgress = currentStudyItem.readingProgress || 0;
               var currentParagraph = _.get(currentStudyItem, 'readingPosition.fragmentId', '');
               var locator = Locator.deserialize(currentParagraph);
               currentLocator = locator;
               data = contentSummary;
               bookId = details.id;
               $container.find('.' + classNames.chapter).remove();
               _.each(data.paragraphs, function (paragraph) {
                  if (paragraph.isChapter) {
                     if (!$('[data-para-id=' + paragraph.id + ']').length) {
                        var el = $('<span class="' + classNames.chapter + '" data-para-id="' + paragraph.id + '">').css({left: paragraph.position + '%'});
                        $container.append(el);
                     }
                  }
               });
               if (!isEditor) {
                  $container.prepend('<span class="' + classNames.position + '"></span><span class="' + classNames.positionMarker + '"></span>');
               }
               if (!$currentPosition || !$currentPosition.length) {
                  $container.append('<span class="' + classNames.currentPosition + '"></span>');
               }
               $currentPosition = $container.find('.' + classNames.currentPosition);
               updateReadingPosition(locator.prefixedParagraphId, readingProgress);
            }

            var audioLocator;
            function changeAudioLocator(l) {
               audioLocator = l;
               toggleRestorePositionButton(audioLocator);
            }

            function paraIdToNumber(paraId) {
               return parseInt(paraId.split('_')[1], 10);
            }

            function findTocIndex(currentIndex, tocRanges) {
               if (!tocRanges) {
                  return 0;
               }
               var tocLength = tocRanges.length;
               for(var i = 0; i < tocLength; i++) {
                  if (tocRanges[i][0] < currentIndex && tocRanges[i][1] >= currentIndex) {
                     return i;
                  }
               }
            }

            function changeToolbarLayout(isHide) {
               if (isOpenFromToolbar) {
                  $timeout(function () {
                     $scope.showToolbar();
                     isOpenFromToolbar = false;
                     if (swFeatureDetector.isTouchInput()) {
                        $scope.hideToolbarDelayed();
                     }
                  });
                  return;
               }

               isDataInitialized = true;
               showHideToolbar((isEditor || !isFirstPage) && isToolbarVisible);
               $scope.readingDuration = 0;
               $scope.toolbarPlaceholder = '';
               $scope.toolbarPlaceholderCurrent = '1 / 1';

               if (isHide) {
                  var index = data.paragraphsMap[currentParagraph];
                  var tocRangesLength = data.tocRanges.length;
                  var tocIndex = findTocIndex(paraIdToNumber(currentParagraph), data.tocRanges);
                  var tocRanges = tocRangesLength > 1 ? data.tocRanges : data.paragraphs;

                  if (_.isFinite(tocIndex)) {
                     $scope.toolbarPlaceholder = data.tocData[tocIndex].text;
                     $scope.toolbarPlaceholderCurrent = ((tocRangesLength > 1 ? tocIndex : index) + 1) + ' / ' + tocRanges.length;
                  }
                  else if (isLastPage) {
                     $scope.toolbarPlaceholder = data.tocData[data.tocData.length - 1].text;
                     $scope.toolbarPlaceholderCurrent = tocRanges.length + ' / ' + tocRanges.length;
                  }

                  if (_.isFinite(index)) {
                     var paragraph = data.paragraphs[index];
                     $scope.toolbarPlaceholderPercent = isLastPage ? 100 : Math.max(Math.round(paragraph.position), 1);
                     $scope.readingRemainingTime = isLastPage ? '' : paragraph.readingRemainingTime;
                  }
               }
               $scope.isToolbarHide = isHide;
               if (isHide) {
                  removePopupButtons();
               }
            }

            function getClosestIndex(pageX) {
               var x = pageX - $container.offset().left;
               x = x >= 0 ? x : 0;
               var maxIndex = data.paragraphs.length - 1;
               var width = $container.width();
               var point = Math.floor(((x * 100) / width) * 1000) / 1000;
               var startArrPosition = Math.floor(data.paragraphs.length * (point / 100));
               if (startArrPosition > maxIndex) {
                  startArrPosition = maxIndex;
               }
               return _closest(data.paragraphs, point, startArrPosition);
            }

            function openClosestParaByPoint(pageX) {
               hidePopup();
               $timeout(function () {
                  openParagraph(data.paragraphs[getClosestIndex(pageX)].id);
               });
            }

            function getMaterialInfo(data) {
               var str = '';
               _.each(data, function (item) {
                  str +=  '<i class="' + (item.type === 'EssayTask' ? 'i-essay-task' : item.testType === 'Quiz' ? 'i-quiz' : 'i-flashcard') + '"></i> ' +
                           (item.topic ? item.topic : item.testName) + (data.length > 1 ? '<br/>' : '');
               });
               return str;
            }

            function materialsChangeListener(m) {
               data.materials = _.groupBy(m, function (material) {
                  return material.locator.paragraphId ? material.locator.paragraphId : material.locator;
               });
               $container.find('.' + classNames.materialsMarker).remove();
               _.each(_.keys(data.materials), function (key) {
                  var el = $('<span class="' + classNames.materialsMarker + '" data-para-id="' + key + '"></span>')
                     .css({left: data.paragraphs[data.paragraphsMap[key]].position + '%'});
                  $container.append(el);
               });
            }

            function toggleRestorePositionButton(audioPosition, readingPosition) {
               var locator = readingPosition || audioPosition;
               var isPositionOutOfArea = Boolean(locator && !ReadingPosition.isInsideReadingArea(locator));
               var $btn = $element.find('.' + classNames.audioButton);
               $btn.toggleClass(classNames.readingPositionButton, Boolean(readingPosition)).toggle(isPositionOutOfArea);
            }

            var count = 0;
            function updateCurrentPosition(locators) {
               var isReadingPosition = Boolean(locators.readingPosition);
               var currentOffset = Math.round(locators.currentPosition.logicalCharOffset ? locators.currentPosition.logicalCharOffset / 7 : 0);
               var readingOffset = Math.round(locators.readingPosition && locators.readingPosition.logicalCharOffset ? locators.readingPosition.logicalCharOffset / 7 : 0);
               var readingPosition = isReadingPosition ? locators.readingPosition.prefixedParagraphId : null;
               currentParagraph = locators.currentPosition.prefixedParagraphId || data.paragraphs[0].id;
               currentLocator = locators.currentPosition;
               isFirstPage = locators.isFirstPage;
               isLastPage = locators.isLastPage;

               if (locators.isLastPage) {
                  currentParagraph = data.paragraphs[data.paragraphs.length - 1].id;
                  currentOffset = data.paragraphs[data.paragraphs.length - 1].words;
                  if (isReadingPosition && currentParagraph === readingPosition) {
                     isReadingPosition = false;
                  }
               }

               togglePositionMarker(!isReadingPosition);

               toggleRestorePositionButton(audioLocator, locators.pessimisticReadingPosition || locators.readingPosition);

               var isVisible = swProgressToolbarService.getStartPopupVisibility();
               if (isVisible) {
                  showPopupButtons(isReadingPosition);
               }
               if (count++) {
                  count = 0;
                  removePopupButtons();
               }

               if (isReadingPosition) {
                  updatePosition(readingPosition, readingOffset, 'reading');
                  updatePosition(currentParagraph, currentOffset, 'current');
               }
               else {
                  updatePosition(currentParagraph, currentOffset, (isEditor ? 'current' : 'reading'));
               }
            }

            function updateReadingPosition(para, progress) {
               updatePosition(para, progress, 'reading');
            }

            function updatePosition(para, progress, type) {
               if (!para) {
                  return;
               }
               if (para.indexOf('para_') === -1) {  // assertion
                  throw new Error('Should use a prefixed ID, instead saw ' + para);
               }
               if (!_.isFinite(data.paragraphsMap[para])) {
                  return;
               }
               var readingPositionOffset = data.paragraphs[data.paragraphsMap[para]].position;
               var currentParaIndex = data.paragraphsMap[para];
               var nextParaPosition = data.paragraphs[currentParaIndex + 1] ? data.paragraphs[currentParaIndex + 1].position : 100;
               var difference = nextParaPosition - data.paragraphs[currentParaIndex].position;
               var progressOffset = (progress *  difference) / data.paragraphs[currentParaIndex].words;
               if (progressOffset) {
                  readingPositionOffset += progressOffset;
               }

               if (readingPositionOffset || readingPositionOffset === 0) {
                  if (type === 'current') {
                     $currentPosition.css({left: readingPositionOffset + '%'});
                  }
                  else if (type === 'reading') {
                     readingPosition = new Locator.InTextLocator(para, progress);
                     $container.find('.' + classNames.position).css({right: (100 - readingPositionOffset) + '%'});
                     $container.find('.' + classNames.positionMarker).css({left: readingPositionOffset + '%'});
                  }
               }
            }

            function togglePositionMarker(isSame) {
               if (isEditor) {
                  return;
               }
               var $current = $('.' + classNames.currentPosition);
               var $position = $('.' + classNames.positionMarker);
               if (isSame) {
                  $current.hide();
                  $position.addClass(classNames.onPositionMarker);
               }
               else if (!$current.is(':visible')) {
                  $current.show();
                  $position.removeClass(classNames.onPositionMarker);
               }
            }

            function openParagraph(prefixedParagraphId, isHideToolbar) {
               if (prefixedParagraphId && (prefixedParagraphId !== currentParagraph)) {
                  isOpenFromToolbar = !isHideToolbar;
                  swOpenPublicationService.openPublication(bookId, '#' + prefixedParagraphId, {
                     reload: false
                  });
               }
            }

            function resetReadingPosition() {
               if (currentLocator) {
                  ReadingPosition.resetReadingPosition(currentLocator);
                  var lith = swContentProvider.getView();
                  if (lith) {
                     lith.handleViewportResize(false);
                  }
               }
            }

            function showPopupButtons(isReadingPosition) {
               swProgressToolbarService.setStartPopupVisibility(false);

               if (isReadingPosition) {
                  initPopupButtons();
                  startRemovePopupTimer();
               }
            }

            function initPopupButtons() {
               $element.append(
                  '<button class="' + classNames.popupButtons + ' ' + classNames.popupRestoreRidingPosition + '">Back to Previous Position</button>' +
                  '<button class="' + classNames.popupButtons + ' ' + classNames.popupResetRidingPosition + '">Read from here</button>'
               );
               updatePopupButtonsLayout();
            }

            function updatePopupButtonsLayout() {
               var $btns = $element.find('.' + classNames.popupButtons);
               if (!$btns.length) {
                  return;
               }
               var toolbarCenter = $element.outerWidth() / 2;
               var $restoreRiding = $btns.eq(0);
               var $resetRiding = $btns.eq(1);
               $restoreRiding.css({right: toolbarCenter});
               $resetRiding.css({left: toolbarCenter});
            }

            function removePopupButtons() {
               var $btns = $element.find('.' + classNames.popupButtons);
               if (!$btns.length) {
                  return;
               }
               $btns.addClass('hide-popup-buttons');
               $timeout(function () {
                  $btns.remove();
               }, 300);
            }

            function startRemovePopupTimer() {
               $timeout(function () {
                  removePopupButtons();
               }, 30000);
            }

            function _closest (arr, position, startArrPosition) {
               var min = 0;
               var max = arr.length;
               var index = startArrPosition || 0;
               var current = arr[index].position;
               var inverse = false;

               if (current > position) {
                  inverse = true;
               }

               for (var i = index; i >= min && i <= max; i += (inverse ? -1 : 1)) {
                  if (arr[i] && arr[i].position <= position && arr[i + 1] && arr[i + 1].position > position) {
                     index = i;
                     break;
                  }
               }

               return index;
            }

            $scope.swDestroy = function () {
               isDataInitialized = false;
               swContentProvider.removeOnPublicationLoadListener(init);
               swContentProvider.removeOnExercisesChangeListener(materialsChangeListener);
               swProgressToolbarService.removeOnPositionChangeListener(updateCurrentPosition);
               swApplicationToolbarService.removeOnApplicationToolbarToggleListener(changeToolbarLayout);
               swPublicationAudioManager.removeOnBoundaryListener(changeAudioLocator);
            };
      }]
   });
});
