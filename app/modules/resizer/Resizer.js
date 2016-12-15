define([
   'underscore',
   'ngModule',
   'text!./Resizer.html',
   'less!./Resizer.less'
],
function ( _, ngModule, template ) {
   'use strict';

   var DIRECTIVE_NAME = 'swResizer';
   var ATTR_NAME = 'swResizerAttr';

   ngModule.directive( DIRECTIVE_NAME, ['swLayoutManager', '$document','swFeatureDetector', swResizerDirective]);

   function swResizerDirective(swLayoutManager, $document, swFeatureDetector)
   {
      return {
         restrict: 'E',
         template: template,
         replace: true,
         link: function( scope, element, attr )
         {
            var id = scope.$id;
            var data = scope.$eval(attr[ATTR_NAME]) || {};

            _.defaults(data, {
               firstColumn    : '',
               secondColumn   : '',
               listener       : _.noop,
               stableListener : _.noop,
               position       : 0,
               minWidthColumn : 0
            });

            swLayoutManager.register({
               id    : id,
               layout: _onLayout
            });

            element.on('$destroy', function(){
               swLayoutManager.unregister(id);
            });

            var maxWidthColumn   = 0;
            var firstColumn      = element.siblings(data.firstColumn);
            var secondColumn     = element.siblings(data.secondColumn);
            var firstScrollable  = [];
            var secondScrollable = [];

            if (swFeatureDetector.isDesktop()) {
               _init();
            }

            function _init() {
               _recalcMaxWidth(swLayoutManager.context());
               _onMove(data.position || firstColumn.width());
               _updateLayout();

               element.mousedown(function(e) {
                  if (_isLeftButtonPressed(e)) {
                     _onStartMove();
                  }
                  e.preventDefault();
               });
            }

            function _fillScrollableLazy() {
               firstScrollable = firstScrollable.length ? firstScrollable : firstColumn.find('.sw-scrollable');
               secondScrollable = secondScrollable.length ? secondScrollable : secondColumn.find('.sw-scrollable');
            }

            function _isLeftButtonPressed (e) {
               return (e.buttons !== void 0 ? e.buttons : e.which) === 1;
            }

            function _moveEvent(e) {
               if (_isLeftButtonPressed(e)) {
                  _onMove(e.clientX);
               }
               else {
                  _stableAfterMoving();
               }
            }

            function _onStartMove() {
               _fillScrollableLazy();
               firstScrollable.css('overflow', 'hidden');
               secondScrollable.css('overflow', 'hidden');
               $document.on('mouseup', _stableAfterMoving);
               $document.on('mousemove', _moveEvent);
            }

            function _onMove(x) {
               _changePosition(x);
               if (data.position > data.minWidthColumn && data.position < maxWidthColumn) {
                  _updateLayout();
               }
            }

            function _changePosition(x) {
               x = Math.min(x, maxWidthColumn);
               x = Math.max(x, data.minWidthColumn);
               if (x >= data.minWidthColumn && x <= maxWidthColumn) {
                  data.position = x;
               }
            }

            function _stableAfterMoving() {
               data.stableListener(data.position);

               element.css('left', firstColumn.width());
               _.defer(function () {
                  _fillScrollableLazy();
                  firstScrollable.css('overflow', '').trigger('sizeChange');
                  secondScrollable.css('overflow', '').trigger('sizeChange');
               });
               $document.off('mousemove', _moveEvent);
               $document.off('mouseup', _stableAfterMoving);
            }

            function _updateLayout() {
               firstColumn.css('width', data.position);
               element.css('left', data.position);
               _fillScrollableLazy();
               firstScrollable.trigger('sizeChange');
               secondScrollable.trigger('sizeChange');
               data.listener(data.position);
            }

            function _recalcMaxWidth(context) {
               maxWidthColumn = context.viewport.width - data.minWidthColumn;
            }

            function _onLayout(context) {
               var e = context.events;
               if ( e.resizing || e.orienting ) {
                  _recalcMaxWidth(context);
                  _changePosition(data.position);
                  _updateLayout();
                  _stableAfterMoving();
               }
            }
         }
      };
   }
});
