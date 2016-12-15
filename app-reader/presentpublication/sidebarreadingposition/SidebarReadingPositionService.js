define([
   'module',
   'jquery',
   'swServiceFactory',
   'publication/locator',
   'publication/dom-utils/marker-utils'
], function (module, $, swServiceFactory, Locator, MarkerUtils) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swLayoutManager',
         'swUnifiedSettingsService',
         'swPublicationAudioManager',
         function (swLayoutManager, swUnifiedSettingsService, swPublicationAudioManager) {

            var tempPosition,
                self = this,
                doesAudioPlay = false,
                isElHidden = false,
                $sidebar,
                contentWrapper,
                firstParaId,
                lastParaId,
                $readingPosition,
                oldLocator;

            this.addStateListeners = function () {
               swUnifiedSettingsService.addOnSettingsChangeListener('ReaderSettings', 'showReadingPosition', _readingPosition);
               swPublicationAudioManager.addOnStateChangeListener(_audioStateChange);
               swLayoutManager.register({
                  id    : module.id,
                  layout: function (context) {
                     if (context.events.scrolling && !isElHidden && tempPosition && !$('#' + tempPosition.prefixedParagraphId).length) {
                        isElHidden = true;
                        if ($readingPosition) {
                           $readingPosition.hide();
                        }
                     }
                  }
               });
            };

            this.removeStateListeners = function () {
               swUnifiedSettingsService.removeOnSettingsChangeListener('ReaderSettings', 'showReadingPosition', _readingPosition);
               swPublicationAudioManager.removeOnStateChangeListener(_audioStateChange);
               swLayoutManager.unregister(module.id);
               oldLocator = null;
               doesAudioPlay = false;
            };

            this.updatePosition = function (position) {
               tempPosition = position;
               if (!tempPosition || !swUnifiedSettingsService.getSetting('ReaderSettings', 'showReadingPosition') || doesAudioPlay) {
                  return;
               }

               _initElIfNeed();
               _updatePosition(tempPosition);
            };

            this.getReadingPosition = function () {
               return tempPosition;
            };

            this.redrawPlayButtons = redrawPlayButtons;

            /**
             *
             * @param {boolean} [forceReposition]
             */
            function redrawPlayButtons(forceReposition) {
               $sidebar = $('.bookmarks-sidebar');
               $sidebar.off('.playback').on('click.playback', '[data-play-para]', function() {
                  var paragraphId = this.getAttribute('data-play-para');
                  // assert valid paragraphId
                  swPublicationAudioManager.play(new Locator.InTextLocator(paragraphId, 0), true);
               });

               if ($sidebar.length === 0) { // called without a context
                  return;
               }
               var $playButton = _getPlayButton();
               if ($playButton.length === 0) {
                  return;
               }

               if (doesAudioPlay) {
                  return;
               }

               contentWrapper = $sidebar[0].parentNode.querySelector('.nota-wrapper');
               /** @type {number} */
               var contentWrapperTop = contentWrapper.getClientRects()[0].top;
               var contentBlocks = MarkerUtils.getParagraphElements(contentWrapper);

               var paragraphToSkip = _getPlayButton().attr('data-linked-para');

               var _firstParaId = MarkerUtils.getParagraphId(contentBlocks[0]);
               var _lastParaId = MarkerUtils.getParagraphId(contentBlocks[contentBlocks.length - 1]);
               var $playButtons = _collectPlayButtons($sidebar);
               if ($playButtons.length === 0 || firstParaId !== _firstParaId || lastParaId !== _lastParaId) {
                  firstParaId = _firstParaId;
                  lastParaId = _lastParaId;
                  $playButtons.remove();
                  _refillPlayButtons($sidebar, contentBlocks, contentWrapperTop, paragraphToSkip);
               }
               else if (forceReposition) {
                  $playButtons.each(function() {
                     var playButton = arguments[1];
                     var contentBlock = _collectParaByPlayButton(playButton, contentWrapper);
                     var paraId = MarkerUtils.getParagraphId(contentBlock);
                     if (paraId === paragraphToSkip) {
                        return;
                     }
                     _repositionPlayButton(playButton, contentBlock, contentWrapperTop);
                  });
               }
            }

            /**
             *
             * @param {jQuery} $sidebar
             * @private
             */
            function _clearPlayButtons($sidebar) {
               _collectPlayButtons($sidebar).remove();
            }

            /**
             *
             * @param {jQuery} $sidebar
             * @param {Array.<Element>} contentBlocks
             * @param {number} contentWrapperTop
             * @param {string} paragraphToSkip
             * @private
             */
            function _refillPlayButtons($sidebar, contentBlocks, contentWrapperTop, paragraphToSkip) {
               // assert _collectPlayButtons($sidebar).length === 0

               var playButtonsContainer = contentWrapper.ownerDocument.createDocumentFragment();
               contentBlocks.forEach(function(contentBlock) {
                  if (!contentBlock.hasAttribute('data-audio')) {
                     return;
                  }
                  var paraId = MarkerUtils.getParagraphId(contentBlock);
                  if (paraId === paragraphToSkip) {
                     return;
                  }
                  // $('.' + swPublicationAudioManager.getPlayButtonClassName());
                  var playButton = _createPlayButton(contentBlock);
                  _repositionPlayButton(playButton, contentBlock, contentWrapperTop);
                  playButtonsContainer.appendChild(playButton);
               });
               $sidebar[0].appendChild(playButtonsContainer);
            }

            /**
             *
             * @param {jQuery} $sidebar
             * @returns {jQuery}
             * @private
             */
            function _collectPlayButtons($sidebar) {
               return $sidebar.find('[data-play-para]');
            }

            /**
             *
             * @param {Element} playButton
             * @param {Element} container
             * @returns {Element}
             * @private
             */
            function _collectParaByPlayButton(playButton, container) {
               var paraId = playButton.getAttribute('data-play-para');
               return MarkerUtils.getParagraphById(paraId, container);
            }

            /**
             *
             * @param {Element} playButton
             * @param {Element} contentBlock
             * @param {number} contentWrapperTop
             * @private
             */
            function _repositionPlayButton(playButton, contentBlock, contentWrapperTop) {
               var paraTop = contentBlock.getClientRects()[0].top;
               playButton.style.top = paraTop - contentWrapperTop + 'px';
            }

            function _createPlayButton(contentBlock) {
               var paraId = MarkerUtils.getParagraphId(contentBlock);
               var paraDataId = contentBlock.getAttribute('data-id'); // for debugging only

               var playButton = contentBlock.ownerDocument.createElement('li');
               playButton.classList.add('paragraph-play-button');
               playButton.setAttribute('data-play-para', paraId);
               playButton.innerHTML = '&nbsp;';
               if (paraDataId) {
                  playButton.title = paraDataId;
               }

               return playButton;
            }

            function _audioStateChange(state) {
               doesAudioPlay = state === 'play';
               if (state === 'pause') {
                  oldLocator = null;
                  redrawPlayButtons(true);
               }
               if (doesAudioPlay) {
                  _clearPlayButtons($sidebar);
                  if ($readingPosition) {
                     isElHidden = true;
                     $readingPosition.hide();
                  }
               }
            }

            function _initElIfNeed() {
               $sidebar = $('.bookmarks-sidebar');
               $readingPosition = $sidebar.find('.sidebar-reading-position-marker');
               if (!$readingPosition.length) {
                  $readingPosition = $('<li class="sidebar-reading-position-marker"></li>');
                  $sidebar.append($readingPosition);
               }
            }

            function _readingPosition(setting) {
               if (setting.value) {
                  self.updatePosition(tempPosition);
               }
               else if ($readingPosition) {
                  isElHidden = true;
                  $readingPosition.hide();
               }
            }

            function _getPlayButton() {
               return $('.' + swPublicationAudioManager.getPlayButtonClassName());
            }
            
            function _getPlayButtonOffset(sidebarOffset) {
               var offset = 0,
                   paddingTop,
                   paddingBottom,
                   playButtonTop,
                   playButtonHeight,
                   playButtonBottom,
                   sidebarOffsetBottom,
                   $playButton = _getPlayButton();

               if ($playButton.length && $readingPosition) {
                  paddingTop = parseInt($playButton.css('padding-top')) || 0;
                  paddingBottom = parseInt($playButton.css('padding-bottom')) || 0;
                  playButtonTop = parseInt($playButton.css('top')) + paddingTop;
                  playButtonHeight = $playButton.innerHeight() - paddingTop - paddingBottom;
                  playButtonBottom = playButtonTop + playButtonHeight;
                  sidebarOffsetBottom = sidebarOffset + $readingPosition.height();
                  if (
                     (sidebarOffset > playButtonTop && sidebarOffset < playButtonBottom) ||
                     (sidebarOffsetBottom > playButtonTop && sidebarOffsetBottom < playButtonBottom)
                  ) {
                     offset = playButtonHeight;
                  }
               }
               return offset;
            }

            function _updatePosition(locator) {
               var $para,
                   fontSize,
                   paraOffset,
                   sidebarOffset,
                   paraEl;

               if (
                  !$readingPosition ||
                  !locator.paragraphId ||
                  oldLocator && locator.equals(oldLocator) ||
                  !(paraEl = MarkerUtils.getParagraphById(locator.paragraphId))
               ) {
                  return;
               }

               $para = $(paraEl);
               isElHidden = $para.length === 0;
               $readingPosition.toggle(!isElHidden);

               fontSize = $para.css('font-size');
               paraOffset = Math.max($para.offset().top, 44);
               sidebarOffset = $sidebar.offset().top;
               fontSize = fontSize ? parseInt(fontSize, 10) / 2 : 0;
               sidebarOffset = paraOffset - sidebarOffset + fontSize;

               sidebarOffset += _getPlayButtonOffset(sidebarOffset);

               $readingPosition.css({top: sidebarOffset});
               oldLocator = locator;
            }
         }]
   });
});