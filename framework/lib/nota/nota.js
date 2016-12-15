/*global window, document, console, setTimeout*/
define([
   'underscore',
   'jquery',
   'swTextUtils',
   'publication/dom-utils/marker-utils',
   './selection'
], function(_, $, swTextUtils, MarkerUtils, Selection) {
   'use strict';

   // each module is defined as a result of IIFE Factory method
   // later on they should be separated on the file level as well
   //
   // generic inner functions are prefixed with `_`
   var NS = 'nota';
   var NON_SELECTABLE = '[data-selectable=none]';

   var Utils = (function() {
      function uuid() {
         return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
         {
            /*jshint bitwise: false*/
            /*jshint eqeqeq:  false*/
            var r = Math.random() * 16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
         });
      }

      function inRectangle(x, y, rect) {
         return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      }

      function inElement(x, y, el) {
         var rects = el.getClientRects();
         var i = rects.length;
         while (i--) {
            if (inRectangle(x, y, rects[i])) {
               return true;
            }
         }
         return false;
      }

      function isCompoundElement(node) {
         return node.nodeType === 1 && node.firstChild !== null;
      }

      function isValidTextNode(node) {
         return node.nodeType === 3 && !/^\n\s+$/.test(node.data);
      }

      function extractTextNodes(node, filterFn) {
         var result = [];
         if (!node) {
            return result;
         }
         if (filterFn && !filterFn(node)) {
            return result;
         }
         node = node.firstChild;
         while (node) {
            if (isValidTextNode(node)) {
               result.push(node);
            }
            else if (isCompoundElement(node)) {
               result.push.apply(result, extractTextNodes(node, filterFn));
            }
            node = node.nextSibling;
         }
         return result;
      }

      function collectRangeTextNodes(textNodes, node, endNode, singleElementMode) {
         while (node !== endNode) {
            if (isCompoundElement(node)) {
               if (collectRangeTextNodes(textNodes, node.firstChild, endNode, true)) {
                  return true;
               }
            }
            else if (isValidTextNode(node)) {
               textNodes.push(node);
            }

            if (node.nextSibling === null) {
               if (singleElementMode) {
                  return false;
               }
               else {
                  do {
                     node = node.parentNode;
                  } while (node.nextSibling === null);
                  node = node.nextSibling;
               }
            }
            else {
               node = node.nextSibling;
            }
         }

         textNodes.push(endNode);
         return true;
      }

      function logRange(range) {
         // return;
         if ($.isArray(range)) {
            range.map(logRange);
         }
         else {
            console.log('ancestor', range.commonAncestorContainer);
            console.log('start', [range.startContainer, range.startOffset]);
            console.log('end', [range.endContainer, range.endOffset]);
            console.log('content:', range.toString());
         }
      }

      function extractTextContent(normalizedRanges) {
         var textContent = normalizedRanges.map(function(normRange) {
            return normRange.startContainer.data;
         }).join('\n');
         return textContent;
      }

      /**
       * @param {Range} range
       * @param {HTMLElement} wrapperElement
       * @param {boolean} shouldNotRedecorate
       */
      function decorateTextRange(range, wrapperElement, shouldNotRedecorate) {
         var textNode = range.commonAncestorContainer;
         if (textNode !== range.startContainer || textNode !== range.endContainer) {
            logRange(range);
            throw new Error('incorrect range to decorate');
         }

         var parent = textNode.parentNode;
         if (shouldNotRedecorate &&
               parent.nodeName === wrapperElement.nodeName &&
               parent.className === wrapperElement.className)
         {
            return textNode.parentNode;
         }

         // parent.classList.contains('nota-annotation')
         var isParentDecorate = [].slice.call(wrapperElement.classList, 0).some(function(cl) {
            return parent.classList.contains(cl);
         });

         var isFullNodeDecorate = range.startOffset === 0 && range.endOffset === textNode.data.length;

         if (!shouldNotRedecorate && isParentDecorate && isFullNodeDecorate) {
            wrapperElement.appendChild(textNode);
            parent.insertBefore(wrapperElement, null);
            return wrapperElement;
         }

         range.surroundContents(wrapperElement);
         if (!wrapperElement.firstChild) {
            logRange(range);
            return wrapperElement;
         }

         range.setStart(wrapperElement.firstChild, 0);
         range.setEnd(wrapperElement.lastChild, wrapperElement.lastChild.data.length);

         return wrapperElement;
      }

      function undecorateTextRange(range) {
         var wrapper = range.commonAncestorContainer.parentNode;
         /*if (wrapper.className.indexOf(SELECTION_CLASSNAME) === -1) {
            return; // already unwrapped
         }*/
         var next = wrapper.nextSibling;
         var wrapperParent = wrapper.parentNode;
         var wrappedNodes = [].slice.call(wrapper.childNodes, 0);
         var wrappedNodesCount = wrappedNodes.length;
         var firstWrappedNode = wrappedNodes[0];
         var lastWrappedNode  = wrappedNodes[wrappedNodesCount - 1];
         for (var i = 0; i < wrappedNodesCount; i++) {
            wrapperParent.insertBefore(wrappedNodes[i], next);
         }
         wrapperParent.removeChild(wrapper);
         range.setStart(firstWrappedNode, 0);
         range.setEnd(lastWrappedNode, lastWrappedNode.data.length);
      }

      function undecorateTextNode(wrapper) {
         var wrapperParent = wrapper.parentNode;
         var next = wrapper.nextSibling;
         var wrappedNodes = [].slice.call(wrapper.childNodes, 0);
         var wrappedNodesCount = wrappedNodes.length;
         for (var i = 0; i < wrappedNodesCount; i++) {
            wrapperParent.insertBefore(wrappedNodes[i], next);
         }
         wrapperParent.removeChild(wrapper);
      }

      function getStartingRangeBoundaryByLocator(locator, $root) {
         return getRangeBoundaryByLocator(locator, $root, false);
      }

      function getEndingRangeBoundaryByLocator(locator, $root) {
         return getRangeBoundaryByLocator(locator, $root, true);
      }

      function getRangeBoundaryByLocator(locator, $root, isEndingBoundary) {
         var el = $root.find('#' + locator.id);
         var textNodes = extractTextNodes(el[0], function(el) {
            return !$(el).is(NON_SELECTABLE);
         });
         var accumulatedOffset = 0;
         var currentNodeOffset = 0;
         for (var i = 0, le = textNodes.length; i < le; i++) {
            currentNodeOffset = textNodes[i].data.length;
            accumulatedOffset += currentNodeOffset;
            if (accumulatedOffset > locator.offset) {
               return {
                  container: textNodes[i],
                  offset: locator.offset - (accumulatedOffset - currentNodeOffset)
               };
            }
            else if (accumulatedOffset === locator.offset && isEndingBoundary) {
               return {
                  container: textNodes[i],
                  offset: currentNodeOffset
               };
            }
         }
         return null;
      }

      function getLocatorByPosition(textNode, offset) {
         // assert textNode.nodeType === 3;
         var baseNode = textNode.parentNode;
         while (!baseNode.id) {
            baseNode = baseNode.parentNode;
         }

         var textOffset = 0;
         var textNodes = extractTextNodes(baseNode, function(node) {
            return !$(node).is(NON_SELECTABLE);
         });
         var i = 0;
         var l = textNodes.length;
         for (; i < l; i++) {
            if (textNodes[i] !== textNode) {
               textOffset += textNodes[i].data.length;
            }
            else {
               textOffset += offset;
               break;
            }
         }
         return {
            id: baseNode.id,
            offset: textOffset
         };
      }

      function compareLocators(aLoc, bLoc) {
         return compareParagraphIds(aLoc.id, bLoc.id)  ||  aLoc.offset - bLoc.offset;
      }

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

      function injectStyles(ns, doc, stylesObj) {
         var head = doc.head;
         var styleEl = head.querySelector('style[data-id="' + ns + '"]');
         if (!styleEl) {
            styleEl = doc.createElement('style');
            styleEl.type = 'text/css';
            styleEl.setAttribute('data-id', ns);
            head.appendChild(styleEl);
         }
         var styleElContent = _.map(stylesObj, function(rules, selector) {
            return selector + '{' + _serializeStyleRules(rules) + '}';
         }).join('\n');
         styleEl.innerHTML = styleElContent;
      }

      function _serializeStyleRules(rules) {
         switch (typeof rules) {
            case 'string':
               return rules;
            case 'object':
               return _.map(rules, function(value, key) {
                  return key.replace(/[A-Z]/g, function(repl) {
                     return '-' + repl.toLowerCase();
                  }) + ':' + value;
               }).join(';');
         }
      }

      function normalizeCompoundRange(range) {
         var startContainer = range.startContainer;
         var startOffset  = range.startOffset;
         var endContainer = range.endContainer;
         var endOffset    = range.endOffset;
         if (startContainer === endContainer) {
            return [range];
         }

         var textNodes = [];
         collectRangeTextNodes(textNodes, startContainer, endContainer);
         if (textNodes.length === 1) { // no changes at all
            return [range];
         }

         if (startContainer !== textNodes[0]  ||  endContainer !== textNodes[textNodes.length - 1]) {
            console.log('incorrect textNodes',  textNodes);
            throw new Error('failed to normalize a range');
         }

         textNodes = _.filter(textNodes, function(textNode) {
            return $(textNode.parentNode).closest(NON_SELECTABLE).length === 0 && textNode.data !== '';
         });

         var ranges = textNodes.map(function(textNode) {
            var r = document.createRange();
            r.setStart(textNode, 0);
            r.setEnd(textNode, textNode.data.length);
            return r;
         });

         ranges[0].setStart(startContainer, startOffset);
         ranges[ranges.length - 1].setEnd(endContainer, endOffset);
         if (ranges[ranges.length - 1].endOffset === 0) {
            ranges.pop();
         }
         return ranges;
      }

      function getCategoryStyles(categoryObj, classGetter, readerClass) {
         var styles = {};
         _.each(categoryObj, function(item) {

            var className = '.' + classGetter(item.name, item);
            var classNightName = '.night-theme-template ' + className;
            var textColor = swTextUtils.getTextColor(item.color.slice(1));
            var textNightColor = swTextUtils.getTextColor(item.nightColor.slice(1));

            styles[className] = {};
            styles[classNightName] = {};
            if (item.underline) {
               var underline = getUnderline(item);
               styles['.nota-wrapper ' + className + ', .annotation-sidebar ' + className + ' span, .annotation-list ' + className] = {
                  borderBottom : underline + item.color
               };
               styles['.annotation-sidebar.reduced ' + className] = {
                  border : underline + item.color,
                  boxSizing: 'border-box'
               };
               styles['.night-theme-template .nota-wrapper ' + className +
               ', .night-theme-template .annotation-sidebar ' + className + ' span, ' +
               '.night-theme-template .annotation-list ' + className] = {
                  borderBottom : underline + item.nightColor
               };
               styles['.night-theme-template .annotation-sidebar.reduced ' + className] = {
                  border : underline + item.nightColor,
                  boxSizing: 'border-box'
               };
               styles['.annotation-sidebar.reduced ' + className  + ' span'] = {
                  borderBottom : 'none'
               };
            }
            else {
               styles[className].color = 'black';
               styles[className].backgroundColor = item.color;
               styles[classNightName].color = 'white';
               styles[classNightName].backgroundColor = item.nightColor;
               var gradientFirstLetter = 'linear-gradient(to bottom,rgba(X,0) 0%,rgba(X,0) 15%,rgba(X,1) 35%,rgba(X,1) 80%,rgba(X,0) 95%,rgba(X,0) 100%)';
               var gradient =            'linear-gradient(to bottom,rgba(X,0) 0%,rgba(X,0) 25%,rgba(X,1) 45%,rgba(X,1) 60%,rgba(X,0) 85%,rgba(X,0) 100%)';

               if (readerClass) {
                  styles[className + '.' + readerClass + ':not(li)'] = {
                     background : gradient.replace(/X/g, textColor.rgb.join(','))
                  };
                  styles['.bh-first-letter ' + className + '.' + readerClass] = {
                     background : gradientFirstLetter.replace(/X/g, textColor.rgb.join(','))
                  };
                  styles[classNightName + '.' + readerClass + ':not(li)'] = {
                     background : gradient.replace(/X/g, textNightColor.rgb.join(','))
                  };
                  styles['.night-theme-template .bh-first-letter ' + className + '.' + readerClass] = {
                     background : gradientFirstLetter.replace(/X/g, textNightColor.rgb.join(','))
                  };
               }
            }
         });
         return styles;
      }

      function getUnderline(item) {
         var pencilUnderline = '3px solid ';
         var penUnderline = '1px solid ';
         switch (item.underline) {
            case 'pencilUnderline':
               return pencilUnderline;
            case 'penUnderline':
               return penUnderline;
         }
      }

      function getScrolledOffset($el) {
         return -$el[0].getBoundingClientRect().top + $el[0].scrollTop;
      }

      function encodeHex(str) {
         return str.replace(/./g, function (r, i) {
            return (i ? '-' : '') + r.charCodeAt(0).toString(16);
         });
      }

      function decodeHex(str) {
         return str.replace(/[^-]+-?/g, function (r) {
            return String.fromCharCode(parseInt(r, 16));
         });
      }

      function getParagraphTextContent($par) {
         var $contents = $par.contents().filter(function() {
            return !$(this).is(NON_SELECTABLE);
         });
         return $contents.text();
      }


      var _isNormalizeOk;

      function isNormalizeBuggy(){
         var p = document.createElement('p');

         p.appendChild( document.createTextNode('1 ') );
         p.appendChild( document.createTextNode('2 ') );
         p.appendChild( document.createTextNode('3 ') );

         document.getElementsByTagName('head')[0].appendChild(p);
         p.normalize();
         var isNormalizeOk = (p.childNodes.length === 1);
         document.getElementsByTagName('head')[0].removeChild(p);
         return isNormalizeOk;
      }

      var safeNormalize = function(el) {
         _isNormalizeOk = _.isBoolean(_isNormalizeOk) ? _isNormalizeOk : isNormalizeBuggy();

         if (_isNormalizeOk){
            el.normalize();
            return;
         }

         function normalize (elem) {
           if (!elem) { return; }

            for (var i = 0; i < elem.childNodes.length; i++) {
               var child = elem.childNodes[i];
               if (child.nodeType === 3) {
                  if (child.nextSibling !== null && child.nextSibling.nodeType === 3) {
                     child.nodeValue = child.nodeValue + child.nextSibling.nodeValue;
                     elem.removeChild(child.nextSibling);
                     i--;
                  }
               }
            }
         }
         normalize(el);
      };

      return {
         uuid: uuid,
         inRectangle: inRectangle,
         inElement: inElement,
         isCompoundElement: isCompoundElement,
         isValidTextNode: isValidTextNode,
         extractTextNodes: extractTextNodes,
         collectRangeTextNodes: collectRangeTextNodes,
         normalizeCompoundRange: normalizeCompoundRange,
         logRange: logRange,
         extractTextContent: extractTextContent,
         decorateTextRange: decorateTextRange,
         undecorateTextRange: undecorateTextRange,
         undecorateTextNode: undecorateTextNode,
         getLocatorByPosition: getLocatorByPosition,
         getRangeBoundaryByLocator: getRangeBoundaryByLocator,
         getStartingRangeBoundaryByLocator: getStartingRangeBoundaryByLocator,
         getEndingRangeBoundaryByLocator: getEndingRangeBoundaryByLocator,
         compareLocators: compareLocators,
         compareParagraphIds: compareParagraphIds,
         injectStyles: injectStyles,
         getCategoryStyles: getCategoryStyles,
         getTextColor: swTextUtils.getTextColor,
         getScrolledOffset: getScrolledOffset,
         encodeHex: encodeHex,
         decodeHex: decodeHex,
         safeNormalize: safeNormalize,
         getParagraphTextContent: getParagraphTextContent
      };

   })();

   var Bookmarks = (function Bookmarks() {
      var defaultSettings = {
         defaultBackground: {
            backgroundColor: '#d9effd'
         },
         bookmarksSidebarClass: 'bookmarks-sidebar',
         bookmarksItemClass: 'bookmarks-sidebar-item',
         dataIdName: 'data-bookmarks-id'
      };

      function BookmarksInit(sandbox, $el, moduleSettings) {
         var _settings = _.defaults({}, moduleSettings, defaultSettings);
         var _bookmarks = {
            sandbox: sandbox,
            $el: $el,
            settings: _settings
         };

         $.extend(_bookmarks, methods);
         _bookmarks.$sidebar = $el.find('.' + _bookmarks.settings.bookmarksSidebarClass);
         _bookmarks.initEventHandlers();
         sandbox.on('layoutChanged.core', function() {
            _bookmarks.updateLayout();
         });

         return {
            loadData: function(data) {
               _bookmarks.data = data;
               _bookmarks.renderSidebar();
               //_bookmarks.updateLayout();
            },
            bookmarkExist: function (selection) {
               return _bookmarks.bookmarkExist(selection);
            },
            toggleBookmark: function (selection) {
               if (_bookmarks.bookmarkExist(selection)) {
                  _bookmarks.remove(selection);
               }
               else {
                  _bookmarks.add(selection);
               }
            }
         };
      }

      var methods = {
         _calcPosition: function ($paragraph) {
            var offsetTop = this.$sidebar.offset().top;
            return $paragraph.offset().top + (parseFloat($paragraph.css('padding-top')) || 0) - offsetTop;
            //TODO: investigate possibility calculate the position of the first text node by another way
         },
         getContentElementByPoint: function(x, y) {
            var $target = $( this.$el[0].ownerDocument.elementFromPoint(x, y) );
            var $contentElement = $target.closest('[data-before]');
            return $contentElement.length ? $contentElement : undefined; // try again; TODO: find the nearest via bisect
         },
         initEventHandlers: function() {
            if ( !this.settings.canChangeBookmarks ) {
               return this;
            }

            var self = this;
            self.$sidebar.on('click', function(ev) {
               var $target = $(ev.currentTarget);
               var $contentEl = self.getContentElementByPoint(
                  ev.clientX + self.$sidebar.outerWidth() + (self.$el[0].ownerDocument.dir === 'rtl' ? -100 : 100), // because we can, suddenly!
                  ev.clientY);

               if (!$contentEl) {
                  return;
               }
               var $closestItem = $target.find('[' + self.settings.dataIdName + '="' + $contentEl.attr('id') + '"]');

               if ($closestItem.length) {
                  self.remove($closestItem.attr(self.settings.dataIdName));
                  ev.stopPropagation();
                  self.sandbox.trigger('reset');
               }
               else {
                  var paraId = $contentEl.attr('id');
                  self.add({start: {id: paraId}, end: {id: paraId}});
               }
            });
            return self;
         },
         renderSidebar: function () {
            var $sidebar = this.$sidebar;
            var self = this;
            if (!this.data || !this.data.length) {
               return this;
            }
            var $liTmp = $('<li class="' + self.settings.bookmarksItemClass + '"></li>');
            this.data.forEach(function (bookmark) {
               if (bookmark.position === 'A' || bookmark.position === 'B') {
                  return;
               }

               if ($sidebar.find('[' + self.settings.dataIdName + '=' + bookmark.paragraphId + ']').length) {
                  return;
               }

               var $li = $liTmp.clone();
               var $par = self.$el.find('#' + bookmark.paragraphId);
               if (!$par.length) {
                  console.log('Par #' + bookmark.paragraphId + ' not found');
                  return;
               }
               var position = self._calcPosition($par);
               $li.attr(self.settings.dataIdName, bookmark.paragraphId).css({top: position});
               $sidebar.append($li);
               bookmark.currentText = bookmark.currentText || Utils.getParagraphTextContent($par);
            });
            return this;
         },
         updateLayout: function () {
            var $sidebar = this.$sidebar;
            var self = this;
            $sidebar.find('.' + self.settings.bookmarksItemClass).each(function () {
               var $li = $(this);
               var paragraphId = $li.attr(self.settings.dataIdName);
               var $par = self.$el.find('#' + paragraphId);
               if (!$par.length) {
                  console.log('Par #' + paragraphId + ' not found');
                  $li.remove();
                  return;
               }
               var position = self._calcPosition($par);
               $li.css({top: position});
            });

            return this;
         },
         removeElement: function (id) {
            var $sidebar = this.$sidebar;
            var self = this;
            $sidebar.find('.' + self.settings.bookmarksItemClass + '[' + self.settings.dataIdName + '="' + id + '"]').remove();
         },
         bookmarkExist: function (s) {
            return _.some(this.data, function (val) {
               return val.paragraphId === s.start.id && val.position !== 'A' && val.position !== 'B';
            });
         },
         add: function (dto) {
            var now = _.now();
            var bookmark = {
               id: this.generateId(),
               position: 'aside',
               createdAt: now,
               modifiedAt: now,
               paragraphId: dto.start.id,
               category: dto.category
            };
            this.data = this.data || [];
            this.data.splice(
               this.findIndexToAdd(bookmark), 0, bookmark);
            this.renderSidebar();
            this.sandbox.trigger('changed.data', ['bookmarks', bookmark, 'add']);
         },
         remove: function (_bookmark) {
            var id = _.isObject(_bookmark) ? _bookmark.start.id : _bookmark;
            var index = _.findIndex(this.data, function(bookmark) {
               return bookmark.paragraphId === id && bookmark.position !== 'A' && bookmark.position !== 'B';
            });
            if (index === -1) {
               console.log('no bookmark found', _bookmark);
               return;
            }
            var bookmark = this.data[index];
            this.data.splice(index, 1);
            this.removeElement(id);
            this.sandbox.trigger('changed.data', ['bookmarks', bookmark, 'remove']);
         },
         generateId: function() {
            return Utils.uuid();
         },
         findIndexToAdd: function(bookmarkToAdd) {
            for (var i = 0, l = this.data.length; i < l; i++) {
               if (this.compareBookmarks(this.data[i], bookmarkToAdd) > 0) {
                  break;
               }
            }
            return i;
         },
         compareBookmarks: function(aCom, bCom) {
            return Utils.compareParagraphIds(aCom.paragraphId, bCom.paragraphId) || aCom.createdAt - bCom.createdAt;
         }
      };

      return {
         init: BookmarksInit
      };
   })();

   var Comments = (function Comments() {
      var defaultSettings = {};

      var methods = {
         injectStyles: function() {
            Utils.injectStyles('comments', this.$el[0].ownerDocument,
               getCategoryStyles(this.settings.categories)
            );
            return this;
         },
         initEventHandlers: function() {
            var self = this;
            self.$el.on('click', '.' + getGenericCommentClass(), function(/*ev*/) {
               var commentId = this.getAttribute('data-comment-id');
               var comment = _.findWhere(self.data, { id: commentId });
               if (!comment) {
                  console.log('No comment found for a given highlight; weird');
               }
               self.sandbox.trigger('activated.comment', comment);
            });
         },
         loadData: function(data) {
            var self = this;
            self.data = data;
            _.each(data, function(com) {
               self.render(com);
            });
         },
         render: function(comment) {
            if (comment.position !== 'A' && comment.position !== 'B') {
               // a bookmark
               return;
            }

            var $par = this.$el.find('#' + comment.paragraphId);
            var $el = $par.find('[data-comment-id="' + comment.id + '"]');
            if ($el.length !== 0) {
               comment.$el = $el;
               return;
            }

            comment.currentText = comment.currentText || Utils.getParagraphTextContent($par);
            comment.$el = this.createCommentWrapper(comment);
            comment.$el[0].setAttribute('data-comment-id', comment.id);
            this.reposition(comment);
            this.sandbox.trigger('layoutChanged.core'); // move into renderAll
         },
         decorateBlock: function($block, comments) {
            var self = this;
            var $prevAboveComment;
            _.each(comments, function(comment) {
               if (comment.position !== 'A' && comment.position !== 'B') {
                  return;
               }
               comment.currentText = Utils.getParagraphTextContent($block);
               comment.$el = self.createCommentWrapper(comment).attr('data-comment-id', comment.id);
               self.restyle(comment, comment.$el[0]);
               if (comment.position === 'A') {
                  if ($prevAboveComment) {
                     comment.$el.insertAfter($prevAboveComment);
                  }
                  else {
                     comment.$el.prependTo($block);
                  }
                  $prevAboveComment = comment.$el;
               }
               else {
                  comment.$el.appendTo($block);
               }
            });
         },
         restyle: function(comment, node) {
            node.className = getCommentClass(comment.category) + ' ' +
                            (comment.position === 'B' ? getBelowCommentClass() : getAboveCommentClass());
            /*if () {
               nodeC.addClass();
               node.style.marginTop    = 0;
               node.style.marginBottom = '15px';
            }
            else {
               node.style.marginTop    = 0;
               node.style.marginBottom = '15px';
            }*/
         },
         reposition: function(comment) {
            var isAbove = comment.position === 'A';
            var para = this.$el.find('#' + comment.paragraphId)[0];
            var sibling = this.findSibling(comment);
            var commentNode = comment.$el[0].parentNode.nodeType !== 11 ? para.removeChild(comment.$el[0]) : comment.$el[0];
            this.restyle(comment, commentNode);

            if (sibling) {
               sibling = isAbove ? sibling.$el[0].nextSibling : sibling.$el[0];
            }
            else if (isAbove) {
               sibling = para.firstChild;
            }

            para.insertBefore(commentNode, sibling);
         },
         generateId: function() {
            return Utils.uuid();
         },
         add: function(dto) {
            if (!dto.note) {
               return;
            }

            var now = _.now();
            var comment = {
               id: this.generateId(),
               position: dto.position,
               createdAt: now,
               modifiedAt: now,
               paragraphId: dto.start.id,
               category: dto.category,
               note: dto.note
            };
            this.data = this.data || [];
            this.data.splice(
                  this.findIndexToAdd(comment), 0, comment);
            this.render(comment);
            this.sandbox.trigger('changed.data', ['comments', comment, 'add']);
         },
         remove: function(comment) {
            var index = this.findIndex(comment);
            if (index === -1) {
               console.log('no comment found', comment);
               return;
            }

            comment = this.data[index];
            comment.$el.remove();
            this.data.splice(index, 1);
            this.sandbox.trigger('layoutChanged.core');
            this.sandbox.trigger('changed.data', ['comments', comment, 'remove']);
         },
         update: function(comment) {
            var index = this.findIndex(comment);
            if (index === -1) {
               console.log('no comment found', comment);
               return;
            }
            comment = this.data[index];
            comment.$el.text(comment.note);
            this.reposition(comment);
            this.sandbox.trigger('changed.data', ['comments', comment, 'update']);
         },
         updateCategory: function (oldCategory, newCategory) {
            var isRemove = !newCategory;
            var self = this;
            var updatedItems = [];
            _.each(self.data, function (val) {
               if (val.category === oldCategory) {
                  updatedItems.push(val);
                  val.category = isRemove ? 'Highlight' : newCategory;
                  if (!isRemove) {
                     val.modifiedAt = _.now();
                  }
                  self.reposition(val);
               }
            });
            if (updatedItems.length) {
               this.sandbox.trigger('changed.data', ['comments', updatedItems, (isRemove ? 'removeCategory' : 'update')]);
            }
         },
         removeCategory: function (category) {
            this.updateCategory(category);
         },
         findIndex: function(comment) {
            return _.findIndex(this.data, function(c) {
               return c.id === comment.id;
            });
         },
         findIndexToAdd: function(commentToAdd) {
            for (var i = 0, l = this.data.length; i < l; i++) {
               if (this.compareComments(this.data[i], commentToAdd) > 0) {
                  break;
               }
            }
            return i;
         },
         findSibling: function(comment, isAbove) {
            var index   = this.findIndex(comment);
            var sub = isAbove ? this.data.slice(0, index + 1) :  this.data.slice(index);

            var siblings = _.filter(sub, function(c) {
               return c.id !== comment.id && c.$el && c.position === comment.position && c.paragraphId === comment.paragraphId;
            });

            if (siblings.length) {
               return isAbove ? _.last(siblings) : _.first(siblings);
            }

            return null;
         },
         compareComments: function(aCom, bCom) {
            return Utils.compareParagraphIds(aCom.paragraphId, bCom.paragraphId) ||
                   aCom.createdAt - bCom.createdAt;
         },
         createCommentWrapper: function(comment) {
            var $wrapper = $('<div ' + NON_SELECTABLE.slice(1, -1) + '></div>');
            $wrapper.attr(MarkerUtils.getMetaMarker(), '');
            // TODO: move to css
            // var $wrapperStyles = {
            //    lineHeight: '1.5em',
            //    fontStyle: 'italic',
            //    display: 'block',
            //    opacity: '0.4',
            //    position: 'relative'
            // };
            $wrapper
               // .css($wrapperStyles) // remove as well
               .text(comment.note);
            return $wrapper;
         }
      };

      function CommentsInit(sandbox, $el, moduleSettings) {
         var _settings = _.defaults({}, moduleSettings, defaultSettings);
         var _comments = {
            sandbox: sandbox,
            $el: $el,
            settings: _settings
         };
         $.extend(_comments, methods);
         _comments.injectStyles().initEventHandlers();

         return {
            destroy: function() {

            },
            updateSettings: function(newSettings) {
               _.extend(_comments.settings, newSettings);
               _comments.injectStyles();
            },
            loadData: function(data) {
               _comments.loadData(data);
            },
            addComment: function(preComment) {
               _comments.add(preComment);
            },
            removeComment: function(comment) {
               _comments.remove(comment);
            },
            updateComment: function(comment) {
               _comments.update(comment);
            },
            updateCategory: function (oldCategory, newCategory) {
               _comments.updateCategory(oldCategory, newCategory);
            },
            removeCategory: function (category) {
               _comments.removeCategory(category);
            },
            decorateBlock: function($block, comments) {
               _comments.decorateBlock($block, comments);
            }
         };
      }

      function getCategoryStyles(categoriesObj) {
         return Utils.getCategoryStyles(categoriesObj, getCommentClassByCategory);
      }

      function getCommentClassByCategory(categoryName) {
         return getGenericCommentClass() + '-' + Utils.encodeHex(categoryName);
      }

      function getGenericCommentClass() {
         return NS + '-comment';
      }

      function getCommentClass(categoryName) {
         return getGenericCommentClass() + ' ' + getCommentClassByCategory(categoryName);
      }

      function getAboveCommentClass() {
         return getGenericCommentClass() + '-above';
      }

      function getBelowCommentClass() {
         return getGenericCommentClass() + '-below';
      }

      return {
         init: CommentsInit
      };

   })();

   var Annotations = (function Annotations() {

      var HIGHLIGHTER_ELEMENT = 'span';

      var defaultSettings = {
         reducedSidebarClass: 'reduced',
         isSidebarReduced: false
      };

      function AnnotationsInit(sandbox, $el, moduleSettings) {
         var _settings = _.defaults({}, moduleSettings, defaultSettings);
         var _annotations = {
            sandbox: sandbox,
            $el: $el,
            settings: _settings
         };
         $.extend(_annotations, methods);
         // TODO: refactor into a separate module
         _annotations.$sidebar = $el.find('.annotation-sidebar');
         _annotations.injectStyles().initEventHandlers().renderAll();
         sandbox.on('layoutChanged.core', function() {
            _annotations.renderSidebar();
         });

         return {
            destroy: function() {
               // console.log('should be destroyed');
            },
            updateSettings: function(newSettings) {
               _.extend(_annotations.settings, newSettings);
               _annotations.injectStyles();
            },
            loadData: function(data) {
               _annotations.data = data;
               _annotations.filterOutInvalid();
                // TODO: should we sort this?
               _annotations.renderAll();
            },
            addAnnotation: function(preAnnotation) {
               _annotations.add(preAnnotation);
            },
            removeAnnotation: function(annotation) {
               _annotations.remove(annotation);
            },
            updateAnnotation: function(annotation) {
               _annotations.update(annotation);
            },
            toggleReducedSidebar: function(isSidebarReduced) {
               _annotations.settings.isSidebarReduced = isSidebarReduced;
               _annotations.renderSidebar();
            },
            updateCategory: function (oldCategory, newCategory) {
               _annotations.updateCategory(oldCategory, newCategory);
            },
            removeCategory: function (category) {
               _annotations.removeCategory(category);
            }
         };
      }

      var methods = {
         injectStyles: function() {
            Utils.injectStyles('annotations', this.$el[0].ownerDocument,
               getCategoryStyles(this.settings.categories)
            );
            return this;
         },
         initEventHandlers: function() {
            var self = this;
            self.$el.on('click', '.' + getGenericAnnotationClass(), function(ev) {
               ev.stopImmediatePropagation();
               ev.preventDefault();
               var annotationId = this.getAttribute('data-annotation-id');
               var annotation = _.findWhere(self.data, { id : annotationId });
               if (!annotation) {
                  console.log('No annotation found for a given highlight; weird');
               }
               self.sandbox.trigger('activated.annotation', [annotation, false]);
            });
            self.$sidebar.on('click', 'li', function() {
               var $el = $(this);
               self.sandbox.trigger('activated.annotation', [$el.data('annotation'), true]);
            });
            return self;
         },
         renderAll: function() {
            var self = this;
            var annotations = this.data;
            _.each(annotations, function(ann) {
               self.highlightAnnotation(ann);
               ann.quote = $(ann.highlights).text();
               ann.note = ann.note || '';
            });
            self.renderSidebar();
         },
         filterOutInvalid: function() {
            var annotations = this.data;
            var annotationIds = {};
            var indexes = [];
            // in-place should be used filtering
            _.each(annotations, function(ann, i) {
               if (!(ann.id in annotationIds) && ann.start && ann.end) {
                  annotationIds[ann.id] = true;
                  return;
               }
               indexes.unshift(i);
               // important, should go in reverse order
               // when removing the spoilt ones
            });
            _.each(indexes, function(i) {
               annotations.splice(i, 1);
            });
         },
         add: function(dto) {
            // assert !('id' in dto)
            var now = _.now();
            var annotation = {
               id: this.generateAnnotationId(),
               createdAt: now,
               modifiedAt: now,
               start: dto.start,
               end: dto.end,
               category: dto.category,
               note: dto.note
            };
            this.data = this.data || [];
            this.data.splice(
                  this.findIndexToAdd(annotation), 0, annotation);
            this.sandbox.trigger('changed.data', ['annotations', annotation, 'add']);
            this.renderAll();
         },
         remove: function(annotation) {
            var index = this.findIndex(annotation);
            if (index === -1) {
               console.log('no annotation found', annotation);
               return;
            }
            annotation = this.data[index];
            this.unhighlightAnnotation(annotation);
            this.data.splice(index, 1);
            this.renderSidebar();
            this.sandbox.trigger('changed.data', ['annotations', annotation, 'remove']);
         },
         update: function(annotation) {
            var index = this.findIndex(annotation);
            if (index === -1) {
               console.log('no annotation found', annotation);
               return;
            }
            annotation = this.data[index];
            this.redecorateAnnotation(annotation);
            this.renderSidebar();
            annotation.modifiedAt = _.now();
            this.sandbox.trigger('changed.data', ['annotations', annotation, 'update']);
         },
         updateCategory: function (oldCategory, newCategory) {
            var isRemove = !newCategory;
            var self = this;
            var updatedItems = [];
            _.each(self.data, function (val) {
               if (val.category === oldCategory) {
                  updatedItems.push(val);
                  val.category = isRemove ? 'Highlight' : newCategory;
                  if (!isRemove) {
                     val.modifiedAt = _.now();
                  }
                  self.highlightAnnotation(val);
               }
            });
            if (updatedItems.length) {
               this.renderSidebar();
               this.sandbox.trigger('changed.data', ['annotations', updatedItems, (isRemove ? 'removeCategory' : 'update')]);
            }
         },
         removeCategory: function (category) {
            this.updateCategory(category);
         },
         findIndex: function(annotation) {
            return _.findIndex(this.data, function(ann) {
               return ann.id === annotation.id;
            });
         },
         findIndexToAdd: function(annotationToAdd) {
            for (var i = 0, l = this.data.length; i < l; i++) {
               if (this.compareAnnotations(this.data[i], annotationToAdd) > 0) {
                  break;
               }
            }
            return i;
         },
         compareAnnotations: function(aAnn, bAnn) {
            return Utils.compareLocators(aAnn.start, bAnn.start) ||
                   Utils.compareLocators(aAnn.end, bAnn.end) ||
                   aAnn.createdAt - bAnn.createdAt;
         },
         generateAnnotationId: function() {
            return Utils.uuid();
         },
         unhighlightAnnotation: function(ann) {
            $(ann.highlights).contents().unwrap();
         },
         redecorateAnnotation: function(ann) {
            var newCategoryClass = getAnnotationClassByCategory(ann.category);
            var categoryClassPattern = /^\S+/;
            ann.highlights.forEach(function(highlightElement) {
               highlightElement.className = highlightElement.className.replace(
                  categoryClassPattern, newCategoryClass);
            });
         },
         highlightAnnotation: function(ann) {
            var readerAnnotationClass = getReaderAnnotationClass();
            var firstInContentClass = getGenericAnnotationClass() + '-first';
            var lastInContentClass = getGenericAnnotationClass() + '-last';

            // TODO: proper locators formats conversion
            if (ann.highlights && this.$el[0].contains(ann.highlights[0])) {
               this.redecorateAnnotation(ann);
               /*$(ann.highlights).removeClass().addClass(
                     getAnnotationClass(ann.category));
               if (!ann.studyGuide) {
                  $(ann.highlights).addClass(readerAnnotationClass);
               }*/
               return;
            }
            // TODO: decorate by block, otherwise annotation will be shown only if all its paras are in DOM
            var _highlights = this.findInTextHighlights(ann);
            if (_highlights.length) {
               ann.highlights = Array.prototype.slice.call(_highlights);
               return;
            }
            var self = this;
            // TODO: remove the conversion code
            var newStyle = ann.start && ann.end;
            var startLocator = newStyle ? ann.start : {
                  id: ann.ranges[0].start.slice(1),
                  offset: ann.ranges[0].startOffset
               };
            ann.start = startLocator;
            var compoundRangeStart = Utils.getStartingRangeBoundaryByLocator(startLocator, this.$el);
            if (!compoundRangeStart) {
               return;
            }

            var endLocator = newStyle ? ann.end : {
                  id: ann.ranges[ann.ranges.length - 1].end.slice(1),
                  offset: ann.ranges[ann.ranges.length - 1].endOffset
               };
            ann.end = endLocator;

            var compoundRangeEnd = Utils.getEndingRangeBoundaryByLocator(endLocator, this.$el);
            if (!compoundRangeEnd) {
               return;
            }

            var range = this.$el[0].ownerDocument.createRange();
            range.setStart(compoundRangeStart.container, compoundRangeStart.offset);
            range.setEnd(compoundRangeEnd.container, compoundRangeEnd.offset);


            var ranges = Utils.normalizeCompoundRange(range);
            ann.highlights = [];
            var prevContentBlock = null;
            _.each(ranges, function(r) {
               var highlightElement = self.createAnnotationWrapper(ann.category);
               Utils.decorateTextRange(r, highlightElement);
               highlightElement.setAttribute('data-annotation-id', ann.id);
               ann.highlights.push(highlightElement);

               var $contentBlock = $(highlightElement).closest('[data-before]');
               if (prevContentBlock !== $contentBlock[0]) {
                  highlightElement.classList.add(firstInContentClass);
                  if (prevContentBlock !== null) {
                     ann.highlights[ann.highlights.length - 2].classList.add(lastInContentClass);
                  }
               }
               prevContentBlock = $contentBlock[0];
               if (ann.studyGuide) {
                  return;
               }
               highlightElement.classList.add(readerAnnotationClass);
            });
            ann.highlights[ann.highlights.length - 1].classList.add(lastInContentClass);
         },
         createAnnotationWrapper: function(categoryName) {
            var wrapper = this.$el[0].ownerDocument.createElement(HIGHLIGHTER_ELEMENT);
            wrapper.className = getAnnotationClass(categoryName);
            return wrapper;
         },
         /**
          *
          * @param {Object} annotation
          * @returns {NodeList}
          */
         findInTextHighlights: function findInTextHighlights(annotation) {
            return this.$el[0].querySelectorAll(HIGHLIGHTER_ELEMENT + '[data-annotation-id="' + annotation.id + '"]');
         },
         /**
          *
          * @param {Object} annotation
          * @returns {boolean}
          */
         isPresent: function isPresent(annotation) {
            return this.findInTextHighlights(annotation).length !== 0;
         },
         renderSidebar: function() {
            var ctx = this;
            var $sidebar = this.$sidebar;
            $sidebar.toggleClass(this.settings.reducedSidebarClass, this.settings.isSidebarReduced);
            $sidebar.empty();
            if (!this.data) {
               return;
            }
            var $liTmpl = $('<li class="sidebar-element"><span></span></li>');
            var $liPrev = null;
            var offsetTop = $sidebar.offset().top;
            var genericAnnotationClass = getGenericAnnotationClass();

            this.data.forEach(function(annotation) {
               var annotationNote = annotation.note || '';
               if (/^\s*$/.test(annotationNote) || !ctx.isPresent(annotation)) {
                  return;
               }
               var $li = $liTmpl.clone();
               var $hl = $(annotation.highlights);
               var classListElem = annotation.highlights[0].classList;

               for(var i = 0; i < classListElem.length; i++){
                  var className = classListElem[i];
                  var isSpecificAnnotationClass = className.indexOf(genericAnnotationClass) === 0 &&
                     className !== genericAnnotationClass;
                  if (isSpecificAnnotationClass){
                     $li[0].classList.add(className);
                  }
               }

               $li
                  // style changes required
                  // .addClass(getAnnotationClass(annotation.category))
                  .data('annotation', annotation)
                  .attr('data-annotation-id', annotation.id)
                  .children()
                  .text(annotationNote);

               $sidebar.append($li);
               var liMarginTop = parseInt($li.css('marginTop')) || 0;

               $li.css({
                  left: 10,
                  top: Math.max(
                     $hl.offset().top - liMarginTop - offsetTop,
                     ($liPrev ? _bottomBorderline($liPrev, offsetTop) : -Infinity))
               });

               $liPrev = $li;
            });

            if ($liPrev && this.$el.find('.paragraph-last').length) {
               var maxHeight = _bottomBorderline($liPrev, offsetTop);
               var height = this.$el.height() > maxHeight ? '' : maxHeight;
               $sidebar.css('height', height);
            }
            else {
               $sidebar.css('height', '');
            }
         }
      };

      function _bottomBorderline($li, offsetTop) {
         return Math.ceil($li.offset().top + $li.outerHeight() - offsetTop);
      }

      function getCategoryStyles(categoryObj) {
         return Utils.getCategoryStyles(categoryObj, getAnnotationClassByCategory, getReaderAnnotationClass());
      }

      function getAnnotationClassByCategory(categoryName) {
         return getGenericAnnotationClass() + '-cat-' + Utils.encodeHex(categoryName);
      }

      function getGenericAnnotationClass() {
         return NS + '-annotation';
      }

      function getAnnotationClass(categoryName) {
         return getAnnotationClassByCategory(categoryName) + ' ' + getGenericAnnotationClass();
      }

      function getReaderAnnotationClass() {
         return getGenericAnnotationClass() + '-reader';
      }

      return {
         init: AnnotationsInit
      };

   })();

   var Test = (function Test() {
      var defaultSettings = {
         dataParaName: 'data-test-para',
         dataIdName: 'data-test-id'
      };

      function TestInit(sandbox, $el, moduleSettings) {
         var _settings = _.defaults({}, moduleSettings, defaultSettings);
         var _test = {
            sandbox: sandbox,
            $el: $el,
            settings: _settings
         };

         $.extend(_test, methods);
         _test.initEventHandlers();

         return {
            loadData: function(data) {
               _test.data = data;
               _test.render(_test.data);
            },
            updateTest: function (test) {
               _test.updateTest(test);
            }
         };
      }


      var methods = {
         _getItem: function ($el) {
            var self = this;
            var para = $el.attr(self.settings.dataParaName);
            var id = $el.attr(self.settings.dataIdName);
            return _.find(self.data, function (val) {
               return val.locator === para && val._id === id;
            });
         },
         initEventHandlers: function () {
            var self = this;
            self.$el.on('click', '.quiz_wrap', function(e) {
               var test = self._getItem($(e.currentTarget));

               if (!test) {
                  console.log('Test is not defined');
                  return;
               }
               self.sandbox.trigger('activated.test', test);
            });

            self.$el.on('click', '.quiz_wrap .quiz-text-block .arrow', function (e) {
               var test = self._getItem($(e.currentTarget).parent().parent().parent());
               e.stopPropagation();
               if (!test) {
                  console.log('Test is not defined');
                  return;
               }
               var droppeDescription = self.settings.openDescription(test._id);

               var elementId = '[' + self.settings.dataIdName + '="' + test._id + '"]';
               var quizEl = self.$el.find(elementId);
               quizEl.replaceWith(self.settings.parseTemplate(test));
               self.settings.calculateQuizeSize(self.$el.find(elementId), droppeDescription);

               self.sandbox.trigger('layoutChanged.core');
               if(!droppeDescription){
                  $(window).resize();
               }
            });

            self.$el.on('click', '.quiz_wrap .remove', function (e) {
               var test = self._getItem($(e.target).closest('.quiz_wrap'));
               e.stopPropagation();
               self.remove(test);
            });

            return this;
         },
         render: function (data) {
            if (typeof this.settings.parseTemplate !== 'function' || !data) {
               return;
            }

            var self = this;
            var quizEl;
            var insetElement = function (value, update) {
               var elementId = '[' + self.settings.dataIdName + '="' + value._id + '"]';
               var droppeDescription = false;
               var element = self.$el.find(elementId);
               if (!element.length) {
                  self.$el.find('#' + value.locator).after(self.settings.parseTemplate(value, 'quiz'));
                  self.settings.calculateQuizeSize(self.$el.find(elementId), droppeDescription);
               }

               if(update){
                  quizEl.replaceWith(self.settings.parseTemplate(value));
                  self.settings.calculateQuizeSize(self.$el.find(elementId), droppeDescription);
               }
            };


            if (_.isArray(data)) {
               _.each(data, function (value) {
                  if (!value) {return;}
                  value.dataAttr = self.getDataAttr(value);
                  insetElement(value);
               });
               this.sandbox.trigger('layoutChanged.core');
            }
            else {
               quizEl = this.$el.find('[' + self.settings.dataIdName + '="' + data._id + '"]');
               data.dataAttr = self.getDataAttr(data);

               if (quizEl.length) {
                  insetElement(data, true);
               }
               else {
                  insetElement(data);
                  this.sandbox.trigger('layoutChanged.core');
               }
            }

            return this;
         },
         remove: function (test) {
            this.$el.find('[' + this.settings.dataIdName + '="' + test._id + '"]').remove();
            this.sandbox.trigger('changed.data', ['test', test, 'remove']);
            this.sandbox.trigger('remove.exercise', test);
            var index = _.findIndex(this.data, function(c) {return c._id === test._id;});
            if (index !== -1) {
               this.data.splice(index, 1);
            }
         },
         updateTest: function (test) {
            if (!('_id' in test) && 'id' in test) {
               test._id = test.id;
            }

            var type = 'update';
            var index = _.findIndex(this.data, function(c) {return c._id === test._id;});

            if (index === -1) {
               index = this.data.length;
               type = 'add';
            }

            this.data[index] = test;
            this.render(test);
            this.sandbox.trigger('changed.data', ['test', test, type]);
         },
         getDataAttr: function (test) {
            return NON_SELECTABLE.slice(1, -1) + ' ' + this.settings.dataParaName + '="' + test.locator + '" ' + this.settings.dataIdName + '="' + test._id + '"';
         }
      };

      return {
         init: TestInit
      };
   })();

   var EssayTask = (function EssayTask() {
      var defaultSettings = {
         dataParaName: 'data-essaytask-para',
         dataIdName: 'data-essaytask-id',
         essayReaderWrapClass: '.essaytask-reader-wrap',
         essayReaderInputClass: '.essaytask-reader-input',
         essayReaderActiveClass: 'active',
         essayReaderEditClass: 'edit'
      };

      function EssayTaskInit(sandbox, $el, moduleSettings) {
         var _settings = _.defaults({}, moduleSettings, defaultSettings);
         var _essayTask = {
            sandbox: sandbox,
            $el: $el,
            settings: _settings
         };

         $.extend(_essayTask, methods);
         _essayTask.initEventHandlers();

         return {
            loadData: function(data) {
               if (data.length) {
                  _essayTask.data = data;
                  _essayTask.render(_essayTask.data);
               }
            },
            updateEssayTask: function (essayTask) {
               _essayTask.updateEssayTask(essayTask);
            }
         };
      }

      var methods = {
         _getItem: function ($el) {
            var self = this;
            var para = $el.attr(self.settings.dataParaName);
            var id = $el.attr(self.settings.dataIdName);
            return _.find(self.data, function (val) {
               return val.locator.paragraphId === para && val._id === id;
            });
         },
         initEventHandlers: function () {
            var self = this;
            self.$el.on('click', '.essaytask_wrap', function(e) {
               var essayTask = self._getItem($(e.currentTarget));

               if (!essayTask) {
                  console.log('Essay Task is not defined');
                  return;
               }
               self.sandbox.trigger('activated.essayTask', essayTask);
            });

            self.$el.on('click', '.essaytask_wrap .remove', function (e) {
               var essayTask = self._getItem($(e.target).closest('.essaytask_wrap'));
               e.stopPropagation();
               self.remove(essayTask);
            });

            self.$el.on('focus', self.settings.essayReaderInputClass, function(e) {
               var $el = $(e.target);
               $el.attr('data-el-height', $el.height());
            });

            self.$el.on('keydown', self.settings.essayReaderInputClass, function(e) {
               e.stopPropagation();
               self.changeMirror($(e.target), e);
            });

            self.$el.on('blur', self.settings.essayReaderInputClass, function (e) {
               var item = _.find(self.data, function (val) {
                  return val._id === $(e.target).closest('[' + self.settings.dataIdName + ']').attr(self.settings.dataIdName);
               });
               var inputValue = e.target.value;
               var wordsInput = inputValue.match(/\S+/g);
               var $el = $(e.target).closest(self.settings.essayReaderWrapClass);

               var wordsLimit = item && item.wordsLimit ? item.wordsLimit : 0;
               wordsInput = wordsInput ? wordsInput.length : 0;

               item.text = inputValue;
               item.wordsNumber = wordsInput;
               if (wordsInput >= wordsLimit) {
                  $el.addClass(self.settings.essayReaderActiveClass);
               }
               else {
                  $el.removeClass(self.settings.essayReaderActiveClass);
               }

               $el.find('.written').text(wordsInput);

               if ($el.data('saved-essay-text') !== inputValue) {
                  $el.data('saved-essay-text', inputValue);
                  self.sandbox.trigger('complete.essayTaskReader', item);
                  self.sandbox.trigger('changed.data', ['EssayTask', item, 'update']);
               }
            });

            self.$el.on('click focus', self.settings.essayReaderWrapClass + ' .submit', function (e) {
               var $el = $(e.target).closest(self.settings.essayReaderWrapClass);
               var item = _.find(self.data, function (val) {
                  return val._id === $el.attr(self.settings.dataIdName);
               });
               var inputValue = $el.find(self.settings.essayReaderInputClass).val();
               var wordsInput = inputValue.match(/\S+/g);
               var wordsLimit = item && item.wordsLimit ? item.wordsLimit : 0;

               wordsInput = wordsInput ? wordsInput.length : 0;
               item.text = inputValue;
               item.wordsNumber = wordsInput;

               if ( wordsInput >= wordsLimit ) {
                  if ( $el.hasClass(self.settings.essayReaderEditClass) ) {
                     $el.removeClass(self.settings.essayReaderEditClass);
                  }
                  else {
                     $el.addClass(self.settings.essayReaderEditClass);
                  }
               }
               else {
                  $el.addClass(self.settings.essayReaderEditClass);
               }
            });

            return this;
         },
         changeMirror: function ($el, e) {
            var self = this;
            var updataLayout = function ($el) {
               if ($el.height() !== parseFloat($el.attr('data-el-height'))) {
                  $el.attr('data-el-height', $el.height());
                  self.sandbox.trigger('layoutChanged.core');
               }
            };

            if (e && e.which === 13) {
               $el.next().html($el.val().replace(/\n/g, '<br/>') + '<br/>.');
               updataLayout($el);
            }
            else {
               setTimeout(function () {
                  $el.next().html($el.val().replace(/\n/g, '<br/>.'));
                  updataLayout($el);
               }, 0);
            }
         },
         render: function (data) {
            if (typeof this.settings.parseTemplate !== 'function' || !data) {
               return;
            }

            var self = this;
            var essayEl;
            var insetElement = function (value) {
               if (!self.$el.find('[' + self.settings.dataIdName + '="' + value._id + '"]').length) {
                  value.activeClass = self.settings.essayReaderActiveClass;
                  value.editClass = self.settings.essayReaderEditClass;
                  self.$el.find('#' + value.locator.paragraphId).after(self.settings.parseTemplate(value, 'essayTask'));

                  var $el = $(self.settings.essayReaderWrapClass + '[' + self.settings.dataIdName + '="' + value._id + '"] textarea');
                  if ($el.val()) {
                     self.changeMirror($el);
                  }
               }
            };

            if (_.isArray(data)) {
               _.each(data, function (value) {
                  if (!value) {return;}
                  value.dataAttr = self.getDataAttr(value);
                  insetElement(value);
               });
               this.sandbox.trigger('layoutChanged.core');
            }
            else {
               essayEl = this.$el.find('[' + self.settings.dataIdName + '="' + data._id + '"]');
               data.dataAttr = self.getDataAttr(data);

               if (essayEl.length) {
                  essayEl.replaceWith(self.settings.parseTemplate(data));
               }
               else {
                  insetElement(data);
                  this.sandbox.trigger('layoutChanged.core');
               }
            }

            return this;
         },
         remove: function (essayTask) {
            this.$el.find('[' + this.settings.dataIdName + '="' + essayTask._id + '"]').remove();
            this.sandbox.trigger('changed.data', ['EssayTask', essayTask, 'remove']);
            this.sandbox.trigger('remove.exercise', essayTask);
            var index = _.findIndex(this.data, function(c) {return c._id === essayTask._id;});
            if (index !== -1) {
               this.data.splice(index, 1);
            }
         },
         updateEssayTask: function (essay) {
            if (!('_id' in essay) && 'id' in essay) {
               essay._id = essay.id;
            }
            var type = 'update';
            var index = _.findIndex(this.data, function(c) {
               var obj = _.isArray(essay) ? essay[0] : essay; return c._id === obj._id;
            });

            if (index === -1) {
               if (!this.data) {
                  this.data = [];
               }
               index = this.data.length;
               type = 'add';
            }

            if(_.isArray(essay)) {
                essay = essay[0];
            }

            this.data[index] = essay;

            this.render(essay);
            this.sandbox.trigger('changed.data', ['EssayTask', essay, type]);
         },
         getDataAttr: function (essay) {
            return NON_SELECTABLE.slice(1, -1) + ' ' + this.settings.dataParaName + '="' + essay.locator.paragraphId + '" ' + this.settings.dataIdName + '="' + essay._id + '"';
         }
      };

      return {
         init: EssayTaskInit
      };
   })();

   var MicroJournalling = (function MicroJournalling() {
      var defaultSettings = {
         //dataParaName: 'data-test-para',
         dataIdName: 'data-words',
         activeClase: 'active',
         microJournallingClass: 'micro-journalling',
         microJournallingInputClass: 'micro-journalling-input'
      };

      function MicroJournallingInit(sandbox, $el, moduleSettings) {
         var _settings = _.defaults({}, moduleSettings, defaultSettings);
         var _microJournalling = {
            sandbox: sandbox,
            $el: $el,
            settings: _settings
         };

         $.extend(_microJournalling, methods);
         _microJournalling.initEventHandlers();

         return {
            loadData: function(data) {
               var paraSize = parseInt(_settings.paraSize);
               if (isNaN(paraSize)) {
                   return;
               }
               _microJournalling.render(paraSize, data);
            }
         };
      }


      var methods = {
         initEventHandlers: function () {
            var self = this;
            var inputElClass = '.' + self.settings.microJournallingInputClass;

            self.$el.on('blur', inputElClass, function(e) {
               var $el = $(e.currentTarget),
                  $parentEl = $el.parents('.' + self.settings.microJournallingClass),
                  inputVal = $.trim($el.val()),
                  wordsLength = inputVal.match(/\S+/g);

               wordsLength = wordsLength ? wordsLength.length : 0;
               var inputData = {
                  text: inputVal,
                  wordsNumber: wordsLength,
                  locator: {
                     paragraphId: $el[0].getAttribute("data-assign-to")
                  }
               };
               if (inputVal) {
                  $parentEl.addClass(self.settings.activeClase);
                  self.sandbox.trigger('changed.data', ['microJournalling', inputData, 'update']);
               }
               else {
                  inputData.wordsNumber = 0;
                  $parentEl.removeClass(self.settings.activeClase);
                  self.sandbox.trigger('changed.data', ['microJournalling', inputData, 'remove']);
               }

               if ($el.data('saved-microj-text') !== inputVal) {
                  $el.data('saved-microj-text', inputVal);
                  self.sandbox.trigger('microJournalling.complete', inputData);
               }
            });

            self.$el.on('focus', inputElClass, function(e) {
               var $el = $(e.target);
               $el.attr('data-el-height', $el.height());
            });

            self.$el.on('keydown', inputElClass, function(e) {
               e.stopPropagation();
               self.changeMirror($(e.target), e);
            });

            return this;
         },
         changeMirror: function ($el, e) {
            var self = this;
            var updataLayout = function ($el) {
               if ($el.height() !== parseFloat($el.attr('data-el-height'))) {
                  $el.attr('data-el-height', $el.height());
                  //console.log($el);
                  self.sandbox.trigger('layoutChanged.core');
               }
            };

            if (e && e.which === 13) {
               $el.next().html($el.val().replace(/\n/g, '<br/>.') + '<br/>.');
               updataLayout($el);
            }
            else {
               setTimeout(function () {
                  $el.next().html($el.val().replace(/\n/g, '<br/>.'));
                  updataLayout($el);
               }, 0);
            }
         },
         render: function (paraSize, data) {
            var self = this;

            var $collection = this.$el.find('[data-words-count]:not(h1,h2,h3,h4,h5,h6,div)');
            var $sortedCollection = _.filter($collection, function(el) {
               var isFootnote = $(el).attr('epub:type') === 'footnote';
               var words = parseInt(el.getAttribute('data-words-count'), 10);
               return words >= paraSize && el.innerText.length && !isFootnote;
            });

            if ($sortedCollection.length) {
                _.each($sortedCollection, function(el) {
                   var $el = $(el);
                   var value;
                   if (!$el.find('.' + self.settings.microJournallingClass).length) {
                      value = {
                         assignTo      : $el.attr('id'),
                         selection     : NON_SELECTABLE.slice(1, -1),
                         className     : self.settings.microJournallingClass,
                         inputClassName: self.settings.microJournallingInputClass,
                         activeClase   : self.settings.activeClase
                      };

                      _.extend(value, _.find(data, function (val) {
                         return val.locator.paragraphId === value.assignTo;
                      }));
                      $el.append(self.settings.parseMicroJurTemplate(value));

                      var $inputEl = $('.' + self.settings.microJournallingInputClass + '[data-assign-to="' + value.assignTo + '"]');
                      if ($inputEl.val()) {
                         self.changeMirror($inputEl);
                      }
                   }
                });
               this.sandbox.trigger('layoutChanged.core');
            }

            return this;
         }
      };

      return {
         init: MicroJournallingInit
      };
   })();

   var Discussion = (function Discussion() {
      var defaultSettings = {
         relatedIdAttr: 'data-discussion-id'
      };

      function DiscussionInit(sandbox, $el, moduleSettings) {
         var _settings = _.defaults({}, moduleSettings, defaultSettings);
         var _discussion = {
            sandbox: sandbox,
            $el: $el,
            settings: _settings
         };

         $.extend(_discussion, methods);

         return {
            loadData: function(data) {
               _discussion.data = data;
               _discussion.render(data);
            },
            updateDiscussion: function (discussion) {
               _discussion.render(discussion);
            }
         };
      }


      var methods = {
         render: function (data) {
            var self = this;
            _.each(data, function (item) {
               if (!self.$el.find('[' + self.settings.relatedIdAttr + '="' + item._id + '"]').length) {
                  var template = self.settings.getTemplate(item, self.remove.bind(self));
                  if (template) {
                     var attr = {};
                     attr[self.settings.relatedIdAttr] = item._id;
                     attr['data-selectable'] = 'none';
                     template.attr(attr);
                     self.$el.find('#' + item.locator).after(template);
                  }
               }
            });

            return this;
         },
         remove: function (id) {
            if (id) {
               this.$el.find('[' + this.settings.relatedIdAttr + '="' + id + '"]').remove();

               var index = _.findIndex(this.data, function(c) {return c._id === id;});
               if (index !== -1) {
                  var discussion = this.data.splice(index, 1)[0];

                  if (!discussion.type) {
                     this.sandbox.trigger('changed.data', ['classDiscussions', discussion, 'remove']);
                     // TODO fix it tomorrow
                  }
               }
            }
         }
      };

      return {
         init: DiscussionInit
      };
   })();

   var Core = (function Core() {
      var availableModules = {
         selection: Selection,
         annotations: Annotations,
         bookmarks: Bookmarks,
         comments: Comments,
         test: Test,
         essayTask: EssayTask,
         microJournalling: MicroJournalling,
         discussionTasks: Discussion,
         classDiscussions: Discussion
      };

      // core shares settings object with all the modules
      var defaultSettings = {
         wrapperClass: 'nota-wrapper',
         textDirection: 'ltr',
         annotationsSidebarClass: 'marks-sidebar annotation-sidebar',
         bookmarksSidebarClass: 'marks-sidebar bookmarks-sidebar',
         _modules: {}
      };

      function CoreInit(lithView, widgetSettings) {
         var $el = lithView.getScrollableElement();
         var _sandbox = $({});
         var _settings = _.defaults({}, widgetSettings, defaultSettings);
         var _core = {
            sandbox: _sandbox,
            settings: _.omit(_settings, '_modules'),
            $el: $el,
            lithView: lithView
         };
         _.defaults(_core, methods);

         _core.initState()
              .initLayout()
              .initModules(_settings._modules);
              // .loadData(widgetData);

         // treating promises in loadData
         // _sandbox.on('loadData.core', function() {
         //    _core.loadData(arguments[1]);
         // });

         /*if (state.dataPromise) { // data
            settings.dataPromise.then(function(data) {
               _core.data = _core.data || {};
               $.extend(_core.data, data);
               _core.render();
            });
         }
         if (settings.data) { // data is already available
            // initialize all the modules based on the available data
         }

         // TODO: this module should be initialized anyway, yet it might be based on some promise data
         var selection = Selection.init(_sandbox, $el, settings);*/

         return {
            destroy: function() {
               if (_core) {
                  _core.destroyModules();
                  _sandbox.off();
                  _sandbox = null;

                  _core = null;
               }
            },
            getSelectionHighlights: function() {
               return _core.getModule('selection').getHighlights();
            },
            // getSelectionRanges: function() {
            //    return _core.getModule('selection').getAllRanges();
            // },
            onSelectionComplete: function(cb) {
               _sandbox.on('completed.selection', function() {
                  cb.apply(null, [].slice.call(arguments, 1));
               });
            },
            onSelectionCollapse: function(cb) {
               _sandbox.on('collapsed.selection', function() {
                  cb.apply(null, [].slice.call(arguments, 1));
               });
            },
            onAnnotationCreate: function() {
               // console.log(arguments)
            },
            onContentElementActivate: function(cb) {
               _sandbox.on('paraMenuActivate.selection', function() {
                  var $contentElement = arguments[1];
                  if ($contentElement) {
                     _core.getModule('selection').reset();
                     cb($contentElement);
                  }
               });
            },
            onAnnotationActivate: function(cb) {
               _sandbox.on('activated.annotation', function() {
                  var annotation = arguments[1];
                  var fromOutside = !!arguments[2];
                  if (fromOutside) {
                     _core.getModule('selection').reset();
                     cb(annotation);
                  }
                  else {
                     setTimeout(function() {
                        if (_core.getModule('selection').isActive()) {
                           return;
                        }
                        cb(annotation);
                     });
                  }
               });
            },
            onCommentActivate: function(cb) {
               _sandbox.on('activated.comment', function() {
                  cb.apply(null, [].slice.call(arguments, 1));
               });
            },
            onDataChange: function(cb) {
               _sandbox.on('changed.data', function() {
                  // console.log(_core.data);
                  var materialsType = arguments[1];
                  var materials = arguments[2];
                  var eventName = arguments[3];
                  cb.apply(null, [materialsType, materials, eventName]);
               });
            },
            hardReset: function() {
               _sandbox.trigger('hardReset');
            },
            reset: function() {
               _sandbox.trigger('reset');
            },
            decorateBlock: function($block, materials) {
               Utils.safeNormalize($block[0]);
               _.each(materials, function(typedMaterials, type) {
                  switch (type) {
                     case 'comments':
                        _core.getModule('comments').decorateBlock($block, typedMaterials);
                  }
               });
            },

            loadMaterials: function(materials) {
               // shimming, actually should be done on loadData level for consistency
               // (where only instantiated modules should be queried)
               _.each(availableModules, function() {
                  var moduleName = arguments[1];
                  if (!(moduleName in materials) && moduleName !== 'selection') {
                     materials[moduleName] = [];
                  }
               });
               _core.loadData(materials);
               _sandbox.trigger('onload');
            },
            toggleMarginNotes: function(marginNotesMode) {
               _core.getModule('annotations').toggleReducedSidebar(!marginNotesMode);
            },
            addAnnotation: function(preAnnotation) {
               _core.getModule('annotations').addAnnotation(preAnnotation);
            },
            updateAnnotation: function(annotationToUpdate) {
               _core.getModule('annotations').updateAnnotation(annotationToUpdate);
            },
            removeAnnotation: function(annotationToRemove) {
               _core.getModule('annotations').removeAnnotation(annotationToRemove);
            },
            addComment: function(preComment) {
               _core.getModule('comments').addComment(preComment);
            },
            updateComment: function(commentToUpdate) {
               _core.getModule('comments').updateComment(commentToUpdate);
            },
            removeComment: function(commentToRemove) {
               _core.getModule('comments').removeComment(commentToRemove);
            },
            layoutChanged: function() {
               _sandbox.trigger('layoutChanged.core');
            },
            toggleBookmark: function (selection) {
               if (!_core.getModule('selection').isActive()) {
                  _core.getModule('selection').reset();
                  _core.getModule('bookmarks').toggleBookmark(selection);
               }
            },
            bookmarkExist: function (selection) {
               return _core.getModule('bookmarks').bookmarkExist(selection);
            },
            updateTest: function (test) {
               _core.getModule('test').updateTest(test);
            },
            updateEssayTask: function (test) {
               _core.getModule('essayTask').updateEssayTask(test);
            },
            addDiscussion: function (discussion) {
               _core.getModule('discussionTasks').addDiscussion(discussion);
            },
            updateDiscussion: function (discussion) {
               _core.getModule('discussionTasks').updateDiscussion(discussion);
            },
            onTestActivate: function(cb) {
               _sandbox.on('activated.test', function() {
                  cb.apply(null, [].slice.call(arguments, 1));
               });
            },
            onEssayTaskActivate: function(cb) {
               _sandbox.on('activated.essayTask', function() {
                  cb.apply(null, [].slice.call(arguments, 1));
               });
            },
            onEssayTaskReaderComplete: function(cb) {
               _sandbox.on('complete.essayTaskReader', function() {
                  cb.apply(null, [].slice.call(arguments, 1));
               });
            },
            onExerciseRemove: function (cb) {
               _sandbox.on('remove.exercise', function() {
                  cb.apply(null, [].slice.call(arguments, 1));
               });
            },
            updateSettings: function (data) {
               _core.getModule('annotations').updateSettings({categories: data});
               _core.getModule('comments').updateSettings({categories: data});
            },
            updateCategory: function (oldCategory, newCategory) {
               _core.getModule('annotations').updateCategory(oldCategory, newCategory);
               _core.getModule('comments').updateCategory(oldCategory, newCategory);
            },
            removeCategory: function (category) {
               _core.getModule('annotations').removeCategory(category);
               _core.getModule('comments').removeCategory(category);
            },
            onMicroJournallingComplete: function (cb) {
               _sandbox.on('microJournalling.complete', function() {
                  cb.apply(null, [].slice.call(arguments, 1));
               });
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
            $el.wrapInner($shiftedContainer)
               .prepend(this.createBookmarksSidebar())
               .append(this.createAnnotationsSidebar());

            this.lithView.setContainerElement($shiftedContainer);
            return this;
         },

         createContentWrapper: function() {
            var $contentWrapper = $('<div></div>');
            $contentWrapper.addClass(this.settings.wrapperClass);
            $contentWrapper.attr('dir', this.settings.textDirection);
            return $contentWrapper;
         },
         createAnnotationsSidebar: function() {
            var $annotationsSidebar = $('<ul ' + NON_SELECTABLE.slice(1, -1) + '></ul>');
            $annotationsSidebar.addClass(this.settings.annotationsSidebarClass);
            return $annotationsSidebar;
         },
         createBookmarksSidebar: function() {
            var $bookmarksSidebar = $('<ul ' + NON_SELECTABLE.slice(1, -1) + '></ul>');
            $bookmarksSidebar.addClass(this.settings.bookmarksSidebarClass);
            return $bookmarksSidebar;
         },

         initModules: function(modulesSettings) {
            var self = this;
            _.each(modulesSettings, function(settings, name) {
               settings = settings || {};
               // var _settings = _.omit(settings, 'categories');
               // if ('_promise' in settings) {
               //    settings._promise.then(function(newSettings) {
               //       self.moduleInstances[name].updateSettings(newSettings);
               //    });
               // }
               //
               self.moduleInstances[name] = availableModules[name].init(
                     self.sandbox, self.$el, settings);
            });
            return self;
         },
         destroyModules: function() {
            var self = this;
            _.each(self.moduleInstances, function(instance) {
               if (_.isFunction(instance.destroy)) {
                  instance.destroy();
               }
            });
         },

         loadData: function(data) {
            var self = this;
            data = data || {};
            // _.extend(self.data, _.omit(data, 'materials'));
            if ('annotations' in data) {
               data.annotations.sort(function(a, b) {
                  var res = Utils.compareLocators(a.start, b.start);
                  res = res || Utils.compareLocators(b.end, a.end);
                  return res;
               });
               // data._promise.then(function(newData) {
                  // newData.annotations.sort(function(a, b) {
                  //    var res = Utils.compareLocators(a.start, b.start);
                  //    res = res || Utils.compareLocators(b.end, a.end);
                  //    return res;
                  // });
                  // self.sandbox.trigger('loadData.core', data.materials);
               // });
            }
            _.extend(self.data, data);
            _.each(self.data, function(data, name) {
               if (!(name in availableModules)) {
                  return;
               }

               if (!(name in self.moduleInstances)) {
                  self.moduleInstances[name] = availableModules[name].init(self.sandbox, self.$el);
               }

               self.moduleInstances[name].loadData(data);
            });
         },

         saveData: function() {
            this.settings.persistCallback(this.data);
         },

         getModule: function(moduleName) {
            return this.moduleInstances[moduleName];
         }
      };

      return {
         init: CoreInit
      };
   })();

   return Core;

});
