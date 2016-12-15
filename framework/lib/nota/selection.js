define([
   'underscore',
   'jquery',
   'publication/locator',
   'publication/highlighter',
   'publication/dom-utils/text-utils',
   'publication/dom-utils/layout-utils',
   'publication/dom-utils/marker-utils'
], function(_, $, Locator, Highlighter, TextUtils, LayoutUtils, MarkerUtils) {
   'use strict';

   var NS = 'nota',
       PARA_ACTIVATE_TIMEOUT = 300,
       NON_SELECTABLE = '[data-selectable=none]',
       START_BORDER_CLASSNAME = 'start',
       END_BORDER_CLASSNAME   = 'end',
       EDGE_MARGIN = 44, // pixels
       HORN_TEMPLATE = '<div class="selection-border"></div>';

   var defaults = {
      rangePattern   : /\S+/,
      activeClass    : '-selection',
      firstClass     : 'start',
      lastClass      : 'end'
   };

   var DIRECTION = {
      START : -1,
      END   :  1,

      NONE  :  0
   };

/*
   // since lodash 4.0.0
   // arggh
   var _detectDirection = _.cond([
      [_isStartHorn,       _.constant(DIRECTION.START)],
      [_isEndHorn,         _.constant(DIRECTION.END)],
      [_.constant(true),   _.constant(DIRECTION.NONE)]
   ]);
*/
   var _detectDirection = function _detectDirection(el) {
      if (_isStartHorn(el)) {
         return DIRECTION.START;
      }
      else if (_isEndHorn(el)) {
         return DIRECTION.END;
      }
      else {
         return DIRECTION.NONE;
      }
   };

   var _getY   = _.flow(_prepareEvent, _.property('clientY')),
       _getX   = _.flow(_prepareEvent, _.property('clientX'));

   var _methods = {
      initializeState: function initializeState() {
         this.pivotLocator       = null;
         this.decoratedLocator   = null;

         this.wasRestored  = false;
         this.deactivate();
         this.direction    = DIRECTION.NONE;

         this.handledEvent = null;
         this.queriedScroll = null;
         this.undecorate();
      },
      isActive: function isActive() {
         return this._isActive;
      },
      deactivate: function() {
         this._isActive = false;
         this.$el[0].ownerDocument.body.removeEventListener(this.SCROLL_TRIGGER, this.edgeScroll);
      },
      activate: function() {
         this._isActive = true;
         this.$el[0].ownerDocument.body.addEventListener(this.SCROLL_TRIGGER, this.edgeScroll, true);
      },
      start: function start(event) {
         // this.reset();
         this.undecorate();
         this.pivotLocator = this.findLocatorByEvent(event);
         if (this.pivotLocator === null) {
            return;
         }

         this.decoratedLocator = null;
         this.activate();
         //event.preventDefault();

         var scroll = this.settings.scrollFactory.getParentScroll(this.$el);
         if (scroll !== this.scroll) {
            if (this.scroll) {
               this.scroll.removeListener(this.updateOnScroll);
            }
            this.scroll = scroll;
            scroll.addListener(this.updateOnScroll);
         }
         this.handledEvent = event;
      },
      complete: function complete(ev) {
          var paraId = ev.target.id;
         if (this.decoratedLocator !== null) {
            ev.preventDefault();
            if (!this.decoratedLocator.isCollapsed()) {
               var model = _createSelectionModel(this.decoratedLocator, this.getHighlights());
               var sandbox = this.sandbox;
               if (this.wasRestored) {
                  // we can't prevent popupClickListener
                  // from Popup.js `child.addEventListener('click', backdropClickHandler, true);`
                  // so reopen popup after some delay
                  _.delay(function() {
                     sandbox.trigger('completed.selection', model);
                  }, 100);
               }
               else {
                  sandbox.trigger('completed.selection', model);
               }
            }
            this.pivotLocator = null;
         }
         else if (paraId) {
            // it's hack to use id for detect para or ann was clicked
            // arghgh
            this.onParaActivate(paraId);
         }
         else {
            this.pivotLocator = null;
         }
         this.deactivate();
         this.handledEvent = null;
         this.direction = DIRECTION.NONE;
      },
      onParaActivate: _.debounce(function onParaActivate(paragraphId) {
         if (this.isActive()) {
            this.sandbox.trigger('paraMenuActivate.selection', paragraphId);
         }
      }, PARA_ACTIVATE_TIMEOUT),
      undecorate: function undecorate() {
         this.$startBorder.hide();
         this.$endBorder.hide();
         Highlighter.undecorateByClass(this._getNotaClassName(), this.$el[0]);
      },
      decorate: function decorate() {
         if (!this.decoratedLocator.isCollapsed()) {
            var body = this.$el[0].ownerDocument;
            Highlighter.decorateInTextRangeLocator(this.decoratedLocator, body, this._getNotaClassName());
            this._showSelectionBorder();
         }
      },
      update: function update(event) {
         this.handledEvent = event;
         if (!this.isActive() || !_isValidTarget(event.target)) {
            return;
         }

         event.preventDefault();
         event.stopPropagation();

         var locator = this.findLocatorByEvent(event);

         if (locator === null) {
            return;
         }

         if (this.direction === DIRECTION.START) {
            if (this.decoratedLocator.endLocator.follows(locator.startLocator)) {
               this.decoratedLocator.startLocator = locator.startLocator;
            }
         }
         else if (this.direction === DIRECTION.END) {
            if (this.decoratedLocator.startLocator.precedes(locator.endLocator)) {
               this.decoratedLocator.endLocator = locator.endLocator;
            }
         }
         else if (this.direction === DIRECTION.NONE && this.pivotLocator !== null) {
            var comparationResult = locator.compareTo(this.pivotLocator);
            if (comparationResult === 0) {
               this.decoratedLocator = this.pivotLocator;
            }
            else {
               var s = comparationResult < 0 ? locator : this.pivotLocator;
               var e = comparationResult > 0 ? locator : this.pivotLocator;
               this.decoratedLocator = new Locator.InTextRangeLocator(s.startLocator, e.endLocator);
            }
         }

         this._normalizeDecoratedLocator();

         this.undecorate();
         this.decorate();
      },
      updateOnScroll: function updateOnScroll() {
         if (this.handledEvent) {
            this.update(this.handledEvent);
         }
      },
      edgeScroll: function edgeScroll(event) {
         if (this.getHighlights().length === 0) {
            return;
         }

         var y = _getY(event);
         var viewportBottomEdgeY = this.window.innerHeight - EDGE_MARGIN;
         if (y > EDGE_MARGIN && y < viewportBottomEdgeY) {
            this.window.clearTimeout(this.queriedScroll);
            return;
         }

         var delta = y - (y < EDGE_MARGIN ? EDGE_MARGIN : viewportBottomEdgeY);
         event.stopPropagation();
         event.preventDefault();
         this._scrollOnSelection(delta);
      },
      _scrollOnSelection: function _scrollOnSelection(delta) {
         if (!this.isActive()) {
            // safety net
            return;
         }

         var scroll = this.scroll;
         if (!scroll) {
            return;
         }

         delta = Math.round(delta);
         var scrollTop = scroll.getScrollTop();
         scroll.setScrollTop(scrollTop + delta);

         var ctx = this;
         this.window.clearTimeout(this.queriedScroll);
         this.queriedScroll = this.window.setTimeout(function() {
            ctx._scrollOnSelection(delta * 1.05);
         }, 50);
      },
      _normalizeDecoratedLocator: function _normalizeDecoratedLocator() {
         var endLocator = this.decoratedLocator.endLocator;
         var startLocator = this.decoratedLocator.startLocator;

         if (startLocator.equals(endLocator)) {
            return;
         }

         if ( _.has(endLocator, 'logicalCharOffset') && endLocator.logicalCharOffset === 0 ) {
            this.decoratedLocator.endLocator = LayoutUtils.getPreviousLocator(endLocator, this.$el[0]);
         }
      },
      repaintSelectionBorder: function repaintSelectionBorder() {
         if (this.decoratedLocator !== null && !this.decoratedLocator.isCollapsed()) {
            this._showSelectionBorder();
         }
      },
      _showSelectionBorder: function _showSelectionBorder() {
         var container = this.$el[0];
         var containerRect = container.getClientRects()[0];
         var top = -1 * containerRect.top;
         var left = containerRect.left;

         // TODO: check for container inDOMness instead?
         var startRect = LayoutUtils.calcLocatorRectangle(this.decoratedLocator.startLocator, container);
         if (startRect === null) {
            return;
         }

         var endRect = LayoutUtils.calcLocatorRectangle(this.decoratedLocator.endLocator, container, true);
         if (endRect === null) {
            return;
         }

         this.$startBorder.show().css({top: top + startRect.top, left: startRect.left - left, height: startRect.height});
         this.$endBorder.show().css({top: top + endRect.top, left: endRect.right - left, height: endRect.height});
      },

      _getNotaClassName: function _getNotaClassName() {
         return NS + this.settings.activeClass;
      },
      reset: function reset() {
         if (this.scroll) {
            this.scroll.removeListener(this.updateOnScroll);
            this.scroll = null;
         }
         this.initializeState();
      },
      restore: function restore(ev) {
         ev.stopPropagation();
         this.wasRestored  = true;
         this.direction    = _detectDirection(ev.currentTarget);
         this.activate();
         this.sandbox.trigger('collapsed.selection');
      },

      /**
       *
       * @param {Event} event
       * @returns {?Locator.InTextRangeLocator}
       */
      findLocatorByEvent: function findLocatorByEvent(event) {
         var container = this.$el[0];
         if (container === null) { // ?
            return null;
         }
         var x = _getX(event);
         var y = _getY(event);

         var elements = MarkerUtils.getParagraphElements(container);
         var position = LayoutUtils.findLogicalPositionByPoint(x, y, elements, container, {
            forceLayoutUsage: false
         });
         if (position === null) {
            return null;
         }

         return LayoutUtils.convertPositionToRangeLocator(position, elements);
      },
      reinitBorders: function reinitBorders() {

         if (this.$el.find('.selection-border').length) {
            return;
         }

         this.$startBorder.remove();
         this.$endBorder.remove();

         this.$startBorder = _createBorder(this.$el, this.restore).addClass(START_BORDER_CLASSNAME).hide();
         this.$endBorder   = _createBorder(this.$el, this.restore).addClass(END_BORDER_CLASSNAME).hide();
      },
      getHighlights: function getHighlights() {
         return this.$el.find('.' + this._getNotaClassName());
      }
   };

   function Selection(sandbox, $el, settings) {
      _.bindAll(this, _.keys(_methods));

      this.$el    = $el;
      this.sandbox   = sandbox;
      this.settings  = _.extend({}, settings, defaults);

      this.$startBorder = $();
      this.$endBorder = $();
      this.window = this.$el[0].ownerDocument.defaultView;

      this.initializeState();
   }
   _.extend(Selection.prototype, _methods);

   function initEventHandlers(selection) {
      var $el = selection.$el;
      var css = {userSelect: 'none'};

      if ('ontouchstart' in $el[0]) {
         css.calloutTouch = 'none';
         selection.SCROLL_TRIGGER = 'touchmove';
         initTouchEventHandlers(selection);
      }
      else {
         selection.SCROLL_TRIGGER = 'mousemove';
         initMouseEventHandlers(selection);
      }

      $el.css(css);
   }

   /**
    * @param {Selection} selection
    */
   function initMouseEventHandlers(selection) {
      selection.$el.on({
         mousedown: function mousedown(ev) {
            if (selection.getHighlights().length || !_isValidTarget(ev.target)) {
               return;
            }
            selection.start(ev);
         },
         mouseup: function mouseup(ev) {
            if (!selection.isActive()) {
               ev.stopPropagation();
               ev.preventDefault();

               return;
            }

            if (ev.button === 0) { // LMB
               selection.complete(ev);
            }
            else if (ev.button === 2) { // RMB
               selection.update(ev);
               selection.complete(ev);
            }
         },
         mousemove: function mousemove(ev) {
            if (ev.button === 0 && ev.buttons > 0) {
               selection.update(ev);
            }
            else if (selection.isActive()) {
               selection.complete(ev);
            }
         },
         dblclick: function dblclick(ev) {
            if (selection.isActive() && !_isValidTarget(ev)) {
               return;
            }
            selection.start(ev);
            selection.update(ev);
            selection.complete(ev);
         },
         contextmenu: function contextmenu() {
            return false;
         }
      });
      _deactivateMouseleaveListener(selection);
      _activateMouseleaveListener(selection);
   }

   function _activateMouseleaveListener(selection) {
      selection.$el.closest('body').on('mouseleave.selection', function(ev) {
         selection.complete(ev);
      });
   }

   function _deactivateMouseleaveListener(selection) {
      if (selection && selection.$el) {
         selection.$el.closest('body').off('mouseleave.selection');
      }
   }

   /* global clearTimeout, setTimeout */
   function initTouchEventHandlers(selection) {
      var longtouchDelayGetter = selection.settings.tapDelayGetter || _.constant(500); // ms
      var longtouchTimer = null;
      var shouldResetSelection = false;
      function resetTimer() {
         if (longtouchTimer) {
            clearTimeout(longtouchTimer);
            longtouchTimer = null;
         }
      }

      selection.$el.on({
         touchstart: function(ev) {
            resetTimer();
            if (_isValidTarget(ev.target)) {
               shouldResetSelection = true;
            }
            longtouchTimer = setTimeout(function() {
               longtouchTimer = null;
               shouldResetSelection = false;

               selection.start(ev);
               selection.update(ev);
            }, longtouchDelayGetter());
         },
         'touchend touchcancel': function(ev) {
            resetTimer();
            if (shouldResetSelection) {
               selection.sandbox.trigger('paraMenuActivate.selection', ev.target.id);
               selection.reset();
               shouldResetSelection = false;
            }
            else {
               selection.complete(ev);
            }
         },
         touchmove: function(ev) {
            resetTimer();
            shouldResetSelection = false;
            selection.update(ev);
         }
      });
   }

   function _initPlugin(sandbox, $el, settings) {
      $el = $el.children('.' + settings.className);

      var _selection = new Selection(sandbox, $el, settings);
      initEventHandlers(_selection);

      sandbox.on('reset',     _selection.reset);
      sandbox.on('hardReset', _selection.initializeState);
      sandbox.on('onload',    _selection.reinitBorders);

      sandbox.on('layoutChanged.core', _selection.repaintSelectionBorder);

      return {
         destroy: function destroy() {
            if (_selection.$startBorder) {
               _selection.$startBorder.remove();
               _selection.$startBorder = null;
            }
            if (_selection.$endBorder) {
               _selection.$endBorder.remove();
               _selection.$endBorder = null;
            }
            if (_selection.scroll) {
               _selection.scroll.removeListener(_selection.updateOnScroll);
               _selection.scroll = null;
            }
            _selection.deactivate();
            _deactivateMouseleaveListener(_selection);
            _selection = null;
         },
         reset          : _selection.reset,
         isActive       : _selection.isActive,
         getHighlights  : _selection.getHighlights
      };
   }

   function _prepareEvent(event) {
      if ('originalEvent' in event ) {
         event = event.originalEvent;
      }

      if ('pointers' in event) {
         event = event.pointers[0];
      }

      if (event.targetTouches && (event.targetTouches.length >= 1)) {
         event = event.targetTouches[0];
      }

      return event;
   }

   function _isValidTarget(el) {
      return $(el).closest(NON_SELECTABLE).length === 0;
   }

   function _createBorder($el, restoreFnc) {
      var listeners = { mousedown : restoreFnc, touchstart : restoreFnc };
      return $(HORN_TEMPLATE).appendTo($el).on(listeners);
   }

   function _isStartHorn(el) {
      return el.classList.contains(START_BORDER_CLASSNAME);
   }

   function _isEndHorn(el) {
      return el.classList.contains(END_BORDER_CLASSNAME);
   }

   function _locatorToOldFormat(locator, isWordEnding) {
      var para = MarkerUtils.getElementByLocator(locator);
      var text = TextUtils.extractContentForLegacyHighlighter(para);
      return {
         id       : locator.prefixedParagraphId,
         offset   : TextUtils.recoverRealOffset(locator.logicalCharOffset, text, isWordEnding)
      };
   }

   function _createSelectionModel(locator, $highlights) {
      return {
         start : _locatorToOldFormat(locator.startLocator),
         end   : _locatorToOldFormat(locator.endLocator, true),
         textContent: $highlights.text()
      };
   }

   return {
      init: _initPlugin
   };

});
