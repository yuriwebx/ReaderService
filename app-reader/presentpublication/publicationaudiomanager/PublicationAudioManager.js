define([
   'module',
   'jquery',
   'underscore',
   'swServiceFactory',
   'swLoggerFactory',
   'publication/highlighter',
   'publication/dom-utils/text-utils',
   'publication/dom-utils/marker-utils',
   'publication/reading-position',
   'publication/locator'
], function (module, $, _, swServiceFactory, swLoggerFactory, Highlighter, TextUtils, MarkerUtils, ReadingPosition, Locator) {
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);

   swServiceFactory.create({
      module: module,
      service: [
         '$timeout',
         '$window',
         'swContentProvider',
         'swScrollFactory',
         'swLayoutManager',
         'swUnifiedSettingsService',
         'swOpenPublicationService',
         'swReaderService',
         'swPopupService',
         'swUserAgentDetector',
         'swOfflineModeService',
         function (
            $timeout,
            $window,
            swContentProvider,
            swScrollFactory,
            swLayoutManager,
            swUnifiedSettingsService,
            swOpenPublicationService,
            swReaderService,
            swPopupService,
            swUserAgentDetector,
            swOfflineModeService
         ) {
            logger.trace('create');

            var listeners = [];

            this.onBoundary = function (position) {
               _.each(listeners, _.method('call', null, position));
            };

            this.addOnBoundaryListener = function (listener) {
               listeners = _.union(listeners, [listener]);
            };

            this.removeOnBoundaryListener = function (listener) {
               _.pull(listeners, listener);
            };

            var stateListeners = [];

            this.onStateChange = function (s) {
               state = s;
               _.each(stateListeners, _.method('call', null, s));
            };

            this.addOnStateChangeListener = function (listener) {
               stateListeners = _.union(stateListeners, [listener]);
            };

            this.removeOnStateChangeListener = function (listener) {
               _.pull(stateListeners, listener);
            };

            this.isButtonDisabled = function () {
               return isButtonDisabled;
            };

            var _targetEl;
            this.addKeyboardEventHandler = function (el) {
               if (!el) {
                  return;
               }
               _targetEl = el;
               $window.document.addEventListener('keydown', _keydown);
            };

            this.removeKeyboardEventHandler = function () {
               $window.document.removeEventListener('keydown', _keydown);
            };

            function _keydown(e) {
               if (
                  e.which === 32 && $window.document.activeElement === _targetEl &&
                  (swContentProvider.hasAudio() || swUnifiedSettingsService.getSetting('ScrollSettings', 'reproductionType') === 'TTS')
               ) {
                  self.play();
               }
            }

            this.getPlayButtonClassName = function () {
               return BUTTON_CLASS_NAME;
            };

            ////////////////////// API //////////////////////
            var self = this,
                state,
                audio,
                isAudio,
                oldLocator,
                oldHighlight,
                oldAudioType,
                scroll = null,
                scrollOffset = 0,
                initWithoutLocator = false,
                isButtonDisabled = false,
                isLocalReposition = false,
                isBookScrolled = false,
                HIGHLIGHT_CLASS_NAME = 'audio-highlight',
                BUTTON_CLASS_NAME = 'sidebar-audio-control-button';

            self.onStateChange('');

            var eventsHandler = {
               play: function (locators, isStarted) {
                  self.onStateChange('play');
                  var highlight = HIGHLIGHT_CLASS_NAME;
                  var lastLocator = locators.length ? locators[locators.length - 1].startLocator : null;

                  _undecorate();

                  var currLocator;
                  var prevLocator;
                  oldHighlight = locators[locators.length - 1];
                  while (locators.length) {
                     currLocator = locators.pop();
                     if (prevLocator && currLocator.startLocator.compareBasisTo(prevLocator.startLocator) === -1) {
                        break;
                     }
                     prevLocator = currLocator;
                     Highlighter.decorateReadingPosition(currLocator, highlight);
                     highlight += '-prev';
                  }
                  self.onBoundary(lastLocator);
                  if (lastLocator) {
                     ReadingPosition.resetReadingPosition(lastLocator);
                     var lith = swContentProvider.getView();
                     if (lith) {
                        lith.handleViewportResize(false);
                     }
                     else {
                        logger.warn('lith is not specified');
                     }
                  }
                  _addUpdateSidebarButton();
                  if (isStarted) {
                     _toggleLoader(false);
                  }
               },
               start: function () {
                  self.onStateChange('play');
               },
               end: function () {
                  self.onStateChange('end');
               },
               pause: function () {
                  self.onStateChange('pause');
                  Highlighter.undecorateByClass(HIGHLIGHT_CLASS_NAME + '-prev', $window.document);
                  Highlighter.undecorateByClass(HIGHLIGHT_CLASS_NAME + '-prev-prev', $window.document);
                  _updateClass();
               },
               resume: function () {
                  self.onStateChange('play');
               },
               error: function() {
                  //TODO customize UI
                  swPopupService.showInfoBox({
                     content : '<span>Sorry, the audio was not downloaded</span>'
                  });
                  self.stop();
               }
            };

            var options = {
               autoScroll: true,
               isKeepOnScreen: true
            };

            swUnifiedSettingsService.addOnSettingsChangeListener('ScrollSettings', 'reproductionType', _changeAudioType);
            function _changeAudioType(setting) {
               if (setting.value === 'Audio' && !swContentProvider.hasAudio()) {
                  self.stop();
               }
            }

            this.play = function (locator, isUpdateScrollPosition) {
               if (isButtonDisabled) {
                  return;
               }

               if (!locator && !oldLocator) {
                  initWithoutLocator = true;
               }

               if (locator && !(locator instanceof Locator.PublicationLocator)) {
                  locator = _transformSelectionIntoLocator(locator);
                  _updateScrollOffset(locator);
               }

               if (isUpdateScrollPosition) {
                  _updateScrollOffset(locator);
               }

               if (locator && oldLocator && locator.logicalCharOffset !== oldLocator.logicalCharOffset) {
                  self.stop();
               }

               var audioSpeed = swUnifiedSettingsService.getSetting('ScrollSettings', 'audioSpeed');
               var wordsPerMinute = swContentProvider.getDetails().wordsPerMinute;
               var delta = wordsPerMinute ? wordsPerMinute - 140 : 0;
               options.rate = (audioSpeed - 40 - delta) / 100;
               options.rate = options.rate < 0.5 ? 0.5 : options.rate > 4 ? 4 : options.rate;
               options.autoScroll = swUnifiedSettingsService.getSetting('ScrollSettings', 'audioAutoScrolling');
               options.isKeepOnScreen = swUnifiedSettingsService.getSetting('ScrollSettings', 'readingPosition').toLowerCase() === 'keep on screen';

               isAudio = swUnifiedSettingsService.getSetting('ScrollSettings', 'reproductionType') === 'Audio';
               if (!audio || isAudio !== oldAudioType) {
                  if (audio && isAudio !== oldAudioType) {
                     locator = oldLocator;
                  }
                  audio = isAudio ? new Audio(options, eventsHandler) : new TTS(options, eventsHandler);
                  oldAudioType = isAudio;
               }

               if (state !== 'play' && state !== 'pause') {
                  _init();
                  _toggleLoader(true);
               }

               scrollIntoViewIfNeed(locator);
            };

            this.pause = function () {
               if (audio) {
                  audio.pause();
               }
            };

            this.stop = function () {
               if (audio) {
                  audio.stop();
                  _clear();
               }
            };

            this.goToAudio = function () {
               if (state !== 'play') {
                  this.play();
               }
               else {
                  _openPublication(oldLocator);
               }
            };

            function scrollIntoViewIfNeed(locator, isScrolling) {
               if (!audio) {
                  return;
               }
               try {
                  var firstAudioLocator = audio.getLocator();
                  locator = locator || oldLocator || firstAudioLocator;
                  var isLocatorPrecedesAudio = isAudio && locator.precedes(firstAudioLocator);
                  var $para = $('#' + locator.prefixedParagraphId);
                  if (state === 'play' && !isScrolling) {
                     audio.play(locator);
                     return;
                  }

                  if (!$para.length || isLocatorPrecedesAudio) {
                     locator = isLocatorPrecedesAudio ? firstAudioLocator : locator;
                     _playIfNeed(locator);       //http://stackoverflow.com/a/32571967/2029230
                     _openPublication(locator);
                     $timeout(function () {
                        scrollIntoViewIfNeed(locator, true);
                     }, 200);
                  }
                  else {
                     if (!ReadingPosition.isInsideReadingArea(locator)) {
                        _openPublication(locator);
                     }
                     _playIfNeed(locator);
                  }
               } catch(e) {
                  audio.error(e);
               }

            }

            function _playIfNeed(locator) {
               if (state !== 'play') {
                  audio.play(locator);
               }
            }

            function _openPublication(locator) {
               isLocalReposition = true;
               swOpenPublicationService.openPublication(swReaderService.getBookKey()._id, '#' + locator.toJSON(), {
                  reload: false
               });
            }

            function _undecorate() {
               Highlighter.undecorateByClass(HIGHLIGHT_CLASS_NAME, $window.document);
               Highlighter.undecorateByClass(HIGHLIGHT_CLASS_NAME + '-prev', $window.document);
               Highlighter.undecorateByClass(HIGHLIGHT_CLASS_NAME + '-prev-prev', $window.document);
            }

            function _transformSelectionIntoLocator(range) {
               var paragraphId = range.start.id;
               var offset = range.start.offset;
               // assert range belongs to paragraph in DOM
               var text = TextUtils.extractContent($('#' + paragraphId)[0]);
               var stableOffset = TextUtils.turnIntoStableOffset(offset, text);
               return new Locator.InTextLocator(paragraphId, stableOffset);
            }

            function _init() {
               swLayoutManager.register({
                  id    : module.id,
                  layout: function (context) {
                     if (context.events.resizing || context.events.orienting || context.events.scrolling) {
                        _updateButtonPosition();
                     }
                  }
               });
               scroll = swScrollFactory.getParentScroll($('#publication-placeholder')[0]);
               scroll.addListener(_scrollListener);
            }

            function _updateScrollOffset(locator) {
               if (!options.isKeepOnScreen || !locator) {
                  return;
               }
               var wrapper = $('#' + locator.prefixedParagraphId).parent()[0];
               if (wrapper) {
                  Highlighter.decorateAndAlign(locator, wrapper, function (el) {
                     scrollOffset = el ? $(el).offset().top : 0;
                  });
               }
            }

            function _clear() {
               swLayoutManager.unregister(module.id);
               _undecorate();
               $('.' + BUTTON_CLASS_NAME).remove();
               if ($sidebar) {
                  $sidebar.off('click', '.' + BUTTON_CLASS_NAME);
               }
               audio = null;
               $sidebar = null;
               oldLocator = null;
               isButtonDisabled = false;
               self.onStateChange('');
               self.onBoundary(null);
               if (scroll) {
                  scroll.removeListener(_scrollListener);
                  scroll = null;
               }
            }

            function _scrollListener() {
               isBookScrolled = true;
            }

            var $sidebar;
            var $sidebarButton = $('<div class="' + BUTTON_CLASS_NAME + '"><span></span></div>');
            function _updateClass() {
               if (state === 'play') {
                  $sidebarButton.removeClass('pause');
               }
               else {
                  $sidebarButton.addClass('pause');
               }
            }

            function _addUpdateSidebarButton() {
               if (!$sidebar) {
                  $sidebar = $('.bookmarks-sidebar');
                  $sidebar.append($sidebarButton);
                  $sidebar.on('click', '.' + BUTTON_CLASS_NAME, function () {
                     if (isButtonDisabled) {
                        return;
                     }
                     self.play();
                     _updateClass();
                  });
               }
               if (!$('.' + BUTTON_CLASS_NAME).length) {
                  $sidebar.append($sidebarButton);
               }

               _updateClass();
               _updateButtonPosition();
            }

            var timeout = null;
            function _updateButtonPosition() {
               if (isBookScrolled) {
                  _updateScrollOffset(oldLocator);
               }

               var $hl = $('.' + HIGHLIGHT_CLASS_NAME);
               var $para = oldHighlight && oldHighlight.startLocator ? MarkerUtils.getElementByLocator(oldHighlight.startLocator) : null;
               if (!$hl.length && $para) {
                  Highlighter.decorateInTextRangeLocator(oldHighlight, $window.document, HIGHLIGHT_CLASS_NAME);
                  $hl = $('.' + HIGHLIGHT_CLASS_NAME);
               }
               if ($hl.length) {
                  if (!ReadingPosition.isInsideReadingArea(oldHighlight.startLocator)) {
                     audio.pause();
                     return;
                  }
                  $sidebarButton.show();
                  _addParagraphData($sidebarButton, $hl);
                  var $sidebarButtonNewOffsetTop = $hl.offset().top - $('.bookmarks-sidebar').offset().top;
                  if ($sidebarButton.offset().top !== $sidebarButtonNewOffsetTop) {
                     $sidebarButton.css({top: $sidebarButtonNewOffsetTop});
                  }
                  if (options.autoScroll && !isBookScrolled) {
                     if (options.isKeepOnScreen) {
                        if (initWithoutLocator) {
                           scrollOffset = Math.round(swLayoutManager.context().viewport.height / 3);
                           initWithoutLocator = false;
                        }
                        if (timeout) {
                           $timeout.cancel(timeout);
                           timeout = null;
                        }
                        timeout = $timeout(function () {
                           scroll.scrollIntoViewWithOffset($hl[0], scrollOffset);
                        }, 100);
                     }
                     else {
                        scroll.scrollIntoViewIfNeeded($hl[0]);
                     }
                  }
                  else {
                     isBookScrolled = false;
                  }
               }
               else {
                  if (isBookScrolled) {
                     if (!isLocalReposition) {
                        audio.pause();
                     }
                     isLocalReposition = false;
                  }
                  $sidebarButton.hide();
               }
            }

            /**
             *
             * @param {jQuery} $sidebarButton
             * @param {jQuery} $highlights
             * @private
             */
            function _addParagraphData($sidebarButton, $highlights) {
               var $para = $highlights.closest('[data-before]');
               if ($para.length === 0) {
                  return;
               }
               $sidebarButton.attr('data-linked-para', MarkerUtils.getParagraphId($para[0]));
            }

            var oldLodaing;
            function _toggleLoader(isLoading) {
               if (oldLodaing !== isLoading && $sidebarButton) {
                  isButtonDisabled = isLoading;
                  $sidebarButton[isLoading ? 'addClass' : 'removeClass']('i-spinner');
               }
            }
            ////////////////////// API //////////////////////

            var tempLocator;
            function TTS(options, eventsHandler) {
               logger.trace('TTS initialized');

               this.type = 'tts';
               var isIos8 = swUserAgentDetector.isIos8();
               var _options = _.defaults(options, {
                  rate: 1,
                  volume: 1
               });
               _options.rate = isIos8 ? _options.rate / 4 : _options.rate;

               var speech = $window.speechSynthesis;
               var selfTTS = this;
               var triggerEv = function (type, data, param) {
                  if (eventsHandler && typeof eventsHandler[type] === 'function') {
                     eventsHandler[type].call(null, data, param);
                  }
               };

               this.play = function (locator) {
                  if (speech) {
                     // TODO: refactor MarkerUtils so that when container is omitted, document is used
                     var para = MarkerUtils.getParagraphById(locator.paragraphId, $window.document);
                     var text = TextUtils.extractContent(para);
                     tempLocator = null;
                     _playTTS({text: text, $el: $(para), range: locator});
                  }
                  else {
                     logger.error('speechSynthesis not support');
                  }
               };

               this.pause = function () {
                  speech.pause();
                  _cancelTimer();
                  if (selfTTS.noBoundary) {
                     speech.cancel();
                     selfTTS.paused = true;
                     selfTTS.canceled = true;
                     selfTTS.pauseIndex = 0;
                     triggerEv('pause');
                  }
               };

               this.stop = function () {
                  speech.cancel();
                  selfTTS.canceled = true;
                  selfTTS.paused = false;
               };

               this.getLocator = function () {
                  return tempLocator || new Locator.InTextLocator(MarkerUtils.getFirstLoadedParagraph($window.document).id, 0);
               };

               var timer;
               function _setTimer() {
                  timer = $timeout(function () {
                     if (speech.speaking) {
                        selfTTS.stop();
                     }
                  }, 20000);
               }

               function _cancelTimer() {
                  if (timer) {
                     $timeout.cancel(timer);
                  }
               }

               function _getSentencesOffsets(text) {
                  return TextUtils.locateSentencesInText(text);
               }

               function _getRate() {
                  var min = isIos8 ? 0.1 : 0.5;
                  var max = isIos8 ?   1 : 2;
                  var rate = _options.rate;
                  if (min > rate) {
                     rate = min;
                  }
                  if (rate > max) {
                     rate = max;
                  }
                  return rate;
               }

               function _playTTS(locator) {
                  if (selfTTS.paused) {
                     selfTTS.paused = false;
                  }

                  if (speech.speaking) {
                     self.pause();
                     return;
                  }

                  selfTTS.canceled = false;
                  _setTimer();
                  var offset = TextUtils.recoverRealOffset(locator.range.logicalCharOffset, locator.text);
                  locator.sentences = locator.sentences ? locator.sentences : _getSentencesOffsets(locator.text);

                  if (selfTTS.pauseIndex) {
                     offset = selfTTS.pauseIndex;
                     selfTTS.pauseIndex = null;
                  }

                  if (!locator.sentences.readPosition) {
                     var i = 0;
                     while (locator.sentences[i] && offset > locator.sentences[i][1]) {
                        i++;
                     }
                     locator.sentences = locator.sentences.slice(i);
                     locator.sentences.readPosition = 0;
                     locator.sentences.prevTextLength = offset;
                  }

                  var start = locator.sentences[locator.sentences.readPosition][0] + (!locator.sentences.readPosition ? offset - locator.sentences[locator.sentences.readPosition][0] : 0);
                  var text = locator.text.slice(start, locator.sentences[locator.sentences.readPosition][1]);
                  var msg = new $window.SpeechSynthesisUtterance(text);
                  msg.rate = _getRate();
                  msg.lang = 'en-US';
                  msg.volume = _options.volume;
                  _setEventListener(msg, locator);
                  speech.speak(msg);
               }

               function _setEventListener(msg, locator) {
                  var boundaryTimeout;
                  var setBoundaryTimeout = function () {
                     boundaryTimeout = $timeout(function () {
                        selfTTS.noBoundary = true;
                        var start = locator.sentences[locator.sentences.readPosition][0];
                        var end = locator.sentences[locator.sentences.readPosition][1];
                        var stableOffsetStart = TextUtils.turnIntoStableOffset(start, locator.text);
                        var stableOffsetEnd = TextUtils.turnIntoStableOffset(end, locator.text);
                        var startLocator = new Locator.InTextLocator(locator.range.paragraphId, stableOffsetStart);
                        oldLocator = startLocator;

                        triggerEv('play', [new Locator.InTextRangeLocator(
                           startLocator,
                           new Locator.InTextLocator(locator.range.paragraphId, stableOffsetEnd)
                        )], true);
                     }, 500);
                  };
                  var cancelBoundaryTimeout = function () {
                     if (boundaryTimeout) {
                        $timeout.cancel(boundaryTimeout);
                     }
                  };

                  msg.onboundary = function (e) {
                     if (e.name === 'word') {
                        selfTTS.paused = false;
                        selfTTS.noBoundary = false;
                        _cancelTimer();
                        _setTimer();
                        cancelBoundaryTimeout();
                        var start = e.charIndex + locator.sentences.prevTextLength;
                        var index = locator.text.indexOf(' ', start);
                        if (index === -1) {
                           index = locator.text.length;
                        }
                        var wordLength = index - start;
                        var stableOffset = TextUtils.turnIntoStableOffset(start, locator.text);
                        var startLocator = new Locator.InTextLocator(locator.range.paragraphId, stableOffset);

                        selfTTS.pauseIndex = start + wordLength;
                        oldLocator = startLocator;
                        tempLocator = startLocator;
                        triggerEv('play', [new Locator.InTextRangeLocator(
                           startLocator,
                           new Locator.InTextLocator(locator.range.paragraphId, stableOffset + wordLength)
                        )], true);
                     }
                  };
                  msg.onerror = function (e) {
                     logger.error('TTS error', e);
                  };
                  msg.onstart = function () {
                     setBoundaryTimeout();
                     triggerEv('start');
                  };
                  msg.onpause = function () {
                     speech.cancel();
                     selfTTS.paused = true;
                     selfTTS.canceled = true;
                     triggerEv('pause');
                  };
                  msg.onend = function (e) {
                     _cancelTimer();
                     cancelBoundaryTimeout();
                     if (!selfTTS.canceled) {
                        locator.sentences.prevTextLength = locator.sentences[locator.sentences.readPosition][1];
                        locator.sentences.readPosition = locator.sentences.readPosition + 1;
                        if (locator.sentences[locator.sentences.readPosition]) {
                           oldLocator = locator;
                           _playTTS(locator);
                           return;
                        }
                        var $next = locator.$el.next();
                        while ($next.length && !/para_.+/.test($next[0].id)) {
                           $next = $next.next();
                        }
                        var id = $next.attr('id');

                        if ($next.length && id) {
                           var newLocator = new Locator.InTextLocator(id, 0);
                           oldLocator = newLocator;
                           selfTTS.pauseIndex = 0;
                           locator.sentences.readPosition = 0;
                           locator.sentences.prevTextLength = 0;
                           selfTTS.play(newLocator);
                           return;
                        }
                        else {
                           selfTTS.stop();
                        }
                     }
                     if (!selfTTS.paused) {
                        triggerEv('end', e);
                     }
                  };
               }
            }

            function addOnlineListener() {
               swOfflineModeService.addOnlineModeChangeListener(retry);
            }

            function removeOnlineListener() {
               swOfflineModeService.removeOnlineModeChangeListener(retry);
            }

            var retryLocator = null;
            function retry(isOnline) {
               if (isOnline) {
                  self.play(retryLocator);
                  removeOnlineListener();
               }
            }

            function Audio(options, eventsHandler) {
               logger.trace('Audio initialized');

               this.type = 'audio';
               var selfAudio = this;
               var _options = _.defaults(options, {
                  rate: 1,
                  volume: 1
               });
               var triggerEv = function (type, data, param) {
                  if (eventsHandler && typeof eventsHandler[type] === 'function') {
                     eventsHandler[type].call(null, data, param);
                  }
               };
               var oldTime;
               var initLocator;
               var rafId;
               var raf = function () {
                  var stopRaf = false;
                  if (!audioEl.paused && oldTime !== audioEl.currentTime) {
                     stopRaf = highlightByTime(audioEl.currentTime);
                  }
                  if (!stopRaf) {
                     rafId = $window.requestAnimationFrame(raf);
                  }
                  else if (rafId) {
                     $window.cancelAnimationFrame(rafId);
                  }
               };

               function highlightByTime(newCurrentTime) {
                  oldTime = newCurrentTime;
                  var result = swContentProvider.findByTime(newCurrentTime * 1000);
                  var locators = result.locators;

                  if (result.isEnd) {
                     selfAudio.stop();
                     return true;
                  }

                  if (result.isSkip) {
                     _changeCurrentTime(result.next / 1000);
                     return true;
                  }

                  if (!locators.length) {
                     result = swContentProvider.findByTime(currentTime * 1000);
                     locators = result.locators;
                  }

                  var startLocator = locators[locators.length - 1].startLocator;
                  if (!initLocator) {
                     initLocator = startLocator;
                  }
                  if (!oldLocator || !oldLocator.equals(startLocator)) {
                     if (!oldLocator) {
                        oldLocator = locators[0].startLocator;
                        triggerEv('play', locators.slice(2));
                     }
                     else {
                        locators = locators.filter(function(itrl) {
                           return itrl.endLocator.follows(initLocator);
                        });
                        if (locators.length) {
                           oldLocator = locators[locators.length - 1].startLocator;
                           triggerEv('play', locators, true);
                        }
                     }
                  }
               }

               function _changeCurrentTime(newCurrentTime) {
                  currentTime = newCurrentTime;
                  if (media) {
                     _startRequestMediaCurrentTime();
                  }
                  else {
                     audioEl.currentTime = currentTime;
                     _startPlay();
                  }
               }

               var $audioEl = $('.audio-element');
               var audioEl;
               if (!$audioEl.length) {
                  _initAudioElement();
               }
               else {
                  audioEl = $audioEl[0];
               }

               function _initAudioElement() {
                  audioEl = new $window.Audio();
                  audioEl.autoplay = false;
                  oldUrl = audioEl.src = swContentProvider.getAudioSource();
                  $audioEl = $(audioEl);
                  $audioEl.on('stalled error pause ended play', _eventListener);
                  $audioEl.addClass('audio-element');
                  $audioEl.css({display: 'none'});
                  $('#publication-placeholder').append($audioEl);
               }

               function _mediaSuccess() {
                  //$window.console.log(arguments);
               }

               function _mediaError() {
                  audio.error();
               }

               var mediaCurrentStatus = {};
               function _mediaStatus(e) {
                  mediaCurrentStatus = {
                     loading: e === 1,
                     played: e === 2,
                     paused: e === 3,
                     stopped: e === 4
                  };

                  if (mediaCurrentStatus.played) {
                     _startRequestMediaCurrentTime();
                  }
               }

               function _startRequestMediaCurrentTime() {
                  $timeout(function () {
                     media.seekTo(currentTime * 1000);
                     requestMediaCurrentTime(true);
                  });
               }

               var requestId;
               function requestMediaCurrentTime(init) {
                  media.getCurrentPosition(function (currentTime) {
                     var stopRequest = false;
                     if (currentTime >= 0 && (init || oldTime !== currentTime)) {
                        stopRequest = highlightByTime(currentTime);
                        if (!stopRequest) {
                           requestId = $window.requestAnimationFrame(requestMediaCurrentTime);
                        }
                        else if (requestId) {
                           $window.cancelAnimationFrame(requestId);
                        }
                     }
                  });
               }

               function _eventListener(e) {
                  switch (e.type) {
                     case 'play':
                        _startPlay();
                        triggerEv('resume');
                        initLocator = null;
                        break;
                     case 'pause':
                        //triggerEv('pause');
                        initLocator = null;
                        break;
                     case 'ended':
                        selfAudio.stop();
                        break;
                     case 'stalled':
                        triggerEv('stalled');
                        break;
                     case 'error':
                        triggerEv('error', e);
                        break;
                  }
               }
               
               function _startPlay(isStalled) {
                  if (swOfflineModeService.isOffline()) {
                     addOnlineListener();
                     self.stop();
                     return;
                  }
                  if (audioEl.currentTime > 0 || currentTime === 0) {
                     if (isStalled) {
                        audioEl.play();
                     }
                     $window.requestAnimationFrame(raf);
                  }
                  else {
                     audioEl.pause();
                     audioEl.currentTime = currentTime;
                     $timeout(function () {
                        audioEl.play();
                     }, 50);
                  }
               }

               var isIos = swUserAgentDetector.isIos();

               /**
                *
                * @param {InTextLocator} locator
                */
               var currentTime = 0;
               var oldUrl;
               var media;
               this.play = function (locator) {
                  var url = swContentProvider.getAudioSource();
                  var isLocalUrl = /^file:/.test(url);
                  if ($window.Media && swUserAgentDetector.isAndroid() && isLocalUrl) {
                     if (mediaCurrentStatus.played) {
                        this.pause();
                     }
                     else {
                        if (!media || media.src !== oldUrl) {
                           media = new $window.Media(url, _mediaSuccess, _mediaError, _mediaStatus);
                           oldUrl = media.src;
                        }
                        currentTime = swContentProvider.findByLocator(locator)[0] / 1000;
                        media.play();
                        state = 'play';
                     }
                     initLocator = null;
                  }
                  else {
                     if (audioEl.duration) {
                        if (audioEl.paused) {
                           currentTime = oldTime;
                           audioEl.playbackRate = _options.rate;
                           audioEl.play();
                           triggerEv('resume');
                        }
                        else {
                           this.pause();
                        }
                        return;
                     }

                     if (retryLocator !== locator) {
                        removeOnlineListener();
                     }

                     var timeRanges = swContentProvider.findByLocator(locator);

                     if (!timeRanges) {
                        return;
                     }
                     if (oldUrl !== audioEl.src) {
                        oldUrl = audioEl.src = url;
                     }
                     if (isIos) {
                        audioEl.load();
                     }
                     retryLocator = locator;
                     oldLocator = null;
                     currentTime = timeRanges[0] / 1000;
                     audioEl.playbackRate = _options.rate;
                     audioEl.volume = _options.volume;
                     audioEl.currentTime = currentTime;
                     audioEl.play();
                     state = 'play';
                  }
               };

               this.pause = function () {
                  if (media && mediaCurrentStatus.played) {
                     media.pause();
                     triggerEv('pause');
                     return;
                  }
                  if (audioEl.duration && !audioEl.paused) {
                     audioEl.pause();
                     triggerEv('pause');
                  }
               };

               this.stop = function () {
                  if (media && (!mediaCurrentStatus.stopped)) {
                     media.stop();
                     media.release();
                  }
                  else {
                     audioEl.pause();
                     audioEl.currentTime = 0;
                     audioEl.src = '';
                     $audioEl.off('stalled error pause ended play', _eventListener);
                     $audioEl.remove();
                     retryLocator = null;
                     removeOnlineListener();
                  }
                  triggerEv('end');
               };

               this.error = function(e) {
                  triggerEv('error', e);
               };

               this.getLocator = function () {
                  var locatorByRange = swContentProvider.findByTime(swContentProvider.findByLocator()[0]).locators;
                  return _.get(locatorByRange, '[0].startLocator');
               };
            }

         }]
   });
});