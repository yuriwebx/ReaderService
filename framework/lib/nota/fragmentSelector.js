define([
   'underscore',
   'jquery',
   'publication/dom-utils/marker-utils'
], function(_, $, MarkerUtils) {
   'use strict';

   // var NS = 'fragment-selector';
   var NON_SELECTABLE = '[data-selectable=none]';

   function compareParagraphIds(aParId, bParId) {
      return strnatcmp(aParId, bParId);
   }

   function strnatcmp(aStr, bStr) {
      // natcompare
      var trimmingLeadingZeroesPattern = /(\D|^)0+(?=\d)/g;
      aStr = aStr.replace(trimmingLeadingZeroesPattern, '$1');
      bStr = bStr.replace(trimmingLeadingZeroesPattern, '$1');

      var aPat = /(\d+)|(\D+)/g;
      var bPat = new RegExp(aPat.source, 'g');
      var aGroup, bGroup, cmp;
      while ((aGroup = aPat.exec(aStr)) !== null) {
         bGroup = bPat.exec(bStr);
         if (bGroup === null) {
            return -1;
         }

         cmp = aGroup[0] - bGroup[0];
         if (cmp === cmp) {
            if (cmp !== 0) {
               return cmp < 0 ? -1 : 1;
            }
         }
         else {
            cmp = aGroup[0].localeCompare(bGroup[0]);
            if (cmp !== 0) {
               return cmp;
            }
         }
      }
      return bPat.exec(bStr) === null ? 0 : 1;
   }

   var Core = (function Core() {

      var defaultSettings = {
         wrapperClass: 'fragment-selector-wrapper',
         courseSidebarClass: 'course-sidebar',
         courseHighlightsClass: 'course-highlights',
         _modules: {}
      };

      function CoreInit(lithView, widgetData, widgetSettings) {
         var _settings = _.defaults({}, widgetSettings, defaultSettings);
         var _core = {
            settings: _.omit(_settings, '_modules'),
            $el: lithView.getScrollableElement(),
            lithView: lithView
         };
         _.defaults(_core, methods);
         _core.initState()
            .initLayout().initEventHandler().loadData(widgetData).render();

         return {
            onMenuActivate: function (f) {
               _core.menuActivate = f;
            },
            onSelectionComplete: function (f) {
               _core.selectionComplete = f;
            },
            startSelection: function () {
               _core.setSelection('start');
            },
            endSelection: function () {
               _core.setSelection('end');
            },
            clearSelection: function () {
               _core.data.range = {};
               _core.clear();
               _core.selectionComplete(_core.data.range);
            },
            setSelection: function () {
               //_core.data.range = ;
               _core.render();
            },
            destroy: function () {

            }
         };
      }

      var methods = {
         initState: function() {
            this.data = {};
            // TODO: check for this.modules, call destroy if necessary
            this.moduleInstances = {};
            return this;
         },
         initLayout: function() {
            var $el = this.$el;
            var $shiftedContainer = this.createContentWrapper();

            $el.css({
               userSelect: 'none'
            });

            this.$sidebar = this.createSidebar();

            $el.wrapInner($shiftedContainer)
               .prepend(this.$sidebar);

            this.lithView.setContainerElement($shiftedContainer);
            return this;
         },
         initEventHandler: function () {
            var self = this;

            this.$el.on('click contextmenu', function (e) {
               e.preventDefault();
               self.eventHandler(e, true);
            });
            this.$sidebar.on('click contextmenu', function (e) {
               e.preventDefault();
               self.eventHandler(e);
            });
            return this;
         },
         loadData: function(data) {
            this.data = data || {};
            return this;
         },
         getClosestEl: function (range) {
            var contentEl = this.$el.find('.' + this.settings.wrapperClass)[0],
                firstEl   = MarkerUtils.getFirstLoadedParagraph(contentEl),
                lastEl    = MarkerUtils.getLastLoadedParagraph(contentEl),
                $elements = {start: $('#' + range.start), end: $('#' + range.end)};

            if (range.start && range.end && firstEl && lastEl) {
               var fts = compareParagraphIds(firstEl.id, range.start),
                   lte = compareParagraphIds(lastEl.id,  range.end),
                   fte = compareParagraphIds(firstEl.id, range.end),
                   lts = compareParagraphIds(lastEl.id,  range.start);

               if (fts === lts && fte === lte) {
                  return null;
               }

               if (!$elements.start.length) {
                  if (fts !== -1) {
                     $elements.start = $(firstEl);
                  }
               }
               if (!$elements.end.length) {
                  if (lte === -1) {
                     $elements.end = $(lastEl);
                  }
               }
            }

            return $elements;
         },
         render: function () {
            var self = this,
               $parent = self.$el.find('.' + self.settings.wrapperClass),
               $elementsRange = self.getClosestEl(self.data.range);

            if (!$elementsRange) {
               return;
            }

            var $startRange = $elementsRange.start,
               $endRange = $elementsRange.end,
               checkRootEl = function ($el, type) {
                  var id,
                     localEl = $el,
                     $getParent;

                  while (localEl[0] && $parent[0] && ($getParent = localEl.parent())[0] !== $parent[0]) {
                     localEl = $getParent;
                  }

                  id = localEl.attr('id');
                  if (self.data.range[type] !== id) {
                     self.data.range[type] = id;
                  }

                  return localEl;
               };

            if (this.data.range && this.data.range.start) {
               if ($elementsRange.start.attr('id') === this.data.range.start) {
                  $startRange = checkRootEl($startRange, 'start');
               }

               if ($elementsRange.end.attr('id') === this.data.range.end) {
                  $endRange = checkRootEl($endRange, 'end');
               }

               if (this.data.range.end && $endRange.length && this.data.range.start !== this.data.range.end) {
                  $startRange.add($endRange.add($startRange.nextUntil($endRange)))
                     .addClass(this.settings.courseHighlightsClass);
               } else {
                  $startRange.addClass(this.settings.courseHighlightsClass);
               }
            }
            return this;
         },
         eventHandler: function (e, getCurrentEl) {
            var self = this;
            var x = e.clientX;
            var y = e.clientY;
            var $contentEl = self.getContentElementByPoint(e.clientX + (getCurrentEl ? 0 : (self.$sidebar.outerWidth() + 100)), e.clientY);
            if ($contentEl) {
               self.data.id = $contentEl.attr('id');

               var rang = $contentEl[0].ownerDocument.createRange();
               var childNodes = $contentEl[0].childNodes;
               rang.setStartBefore(childNodes[0]);
               rang.setEndAfter(childNodes[childNodes.length - 1]);
               var rect = rang.getBoundingClientRect();

               var settings = {
                  target: $contentEl[0]
               };
               if ((x >= rect.left && rect.right >= x) && (y >= rect.top && rect.bottom >= y)) {
                  settings.clientX = x;
                  settings.clientY = y;
               }
               else {
                  settings.clientRect = {
                     left  : rect.left,
                     top   : rect.top,
                     width : rect.width,
                     height: rect.height
                  };
               }

               self.menuActivate(self.data.range, settings);
            }
         },
         setSelection: function (type) {
            this.data.range[type] = this.data.id;
            if (this.data.range.start || this.data.range.end) {
               this.clear();
               if (this.data.range.end && compareParagraphIds(this.data.range.start, this.data.range.end) > -1) {
                  var tempEnd = this.data.range.end;
                  this.data.range.end = this.data.range.start;
                  this.data.range.start = tempEnd;
               }
               this.render();
               this.selectionComplete(this.data.range);
            }
         },
         clear: function () {
            this.$el.find('.' + this.settings.courseHighlightsClass).removeClass(this.settings.courseHighlightsClass);
         },

         getContentElementByPoint: function(x, y) {
            var $target = $( this.$el[0].ownerDocument.elementFromPoint(x, y) );
            var $contentElement = $target.closest('[data-before]');
            return $contentElement.length ? $contentElement : undefined; // try again; TODO: find the nearest via bisect
         },

         createContentWrapper: function() {
            var $contentWrapper = $('<div ' + NON_SELECTABLE.slice(1, -1) + '></div>');
            $contentWrapper.addClass(this.settings.wrapperClass);
            return $contentWrapper;
         },
         createSidebar: function() {
            var $courseSidebar = $('<ul ' + NON_SELECTABLE.slice(1, -1) + '></ul>');
            $courseSidebar.addClass(this.settings.courseSidebarClass);
            return $courseSidebar;
         }

      };

      return {
         init: CoreInit
      };
   })();

   return Core;
});