define([
   'jquery',
   'underscore',
   'module',
   'swComponentFactory',
   'text!./Carousel.html',
   'less!./Carousel'
   ],
   function ( $, _, module, swComponentFactory, template ) {
   'use strict';

   /* jshint unused: false */
   swComponentFactory.create({
      module   : module,
      template : template,
      isolatedScope  : {
         stepSize    : '&',
         items       : '='
      },
      controller: ['$timeout',
          function( $timeout , swComponentAugmenter, $scope, $element )
      {
         /* jshint unused: true */

         var vm = $scope;

         /* --- impl --- */
         vm.prev = prev;
         vm.next = next;
         vm.hasPrev = hasPrev;
         vm.hasNext = hasNext;
         vm.onSwipe = onSwipe;

         /* === impl === */
         var wrapper    = $($element),
             carousel   = wrapper.find('.sw-carousel'),
             maxOffset  = 0,
             offset     = 0,
             carouselItems = wrapper.find('.sw-carousel-items'),
             _deferRefresh = _.partial($timeout, _onChange, 5);

         $scope.swLayout = function(context) {
            var isChangeSize = context.events.resizing || context.events.orienting;
            if (isChangeSize) {
               // temp
               carouselItems.css('width', '5000px');
               _deferRefresh();
            }
         };

         $scope.swInit = function() {
            carousel.on('scroll.swcarousel', _onScroll);
         };

         $scope.swDestroy = function() {
            carousel.off('.swcarousel');
         };

         function _getStepSize() {
            var itemWidth = carouselItems.children().eq(0).outerWidth();
            var count = Math.floor(wrapper.innerWidth() / itemWidth);
            return Math.max(1, count - 1) * itemWidth;
         }

         function prev() {
            _go(Math.max(0, offset - _getStepSize()));
         }

         function next() {
            _go(Math.min(maxOffset, offset + _getStepSize()));
         }

         function _go(newOffset) {
            offset = newOffset;
            carousel.animate({scrollLeft: offset}, 'slow');
         }

         function hasPrev() {
            return offset > 0;
         }

         function hasNext() {
            return offset < maxOffset;
         }

         function _onChange() {
            if (!$element.is(':visible')) {
               return;
            }

            var width = 0;
            carouselItems.children().each(function() {
               width = width + $(this).outerWidth(false);
            });

            carouselItems.css('width', width);

            maxOffset = width - wrapper.innerWidth();
         }

         function _onScroll() {
            var oldOffset = offset;
            offset = carousel.scrollLeft();

            if (_comparator(offset) !== _comparator(oldOffset)) {
               $scope.$evalAsync();
            }
         }

         function onSwipe(direction) {
            if (direction === 'left') {
                next();
            }
            else if (direction === 'right') {
                prev();
            }
         }

         $scope.$watch(function() {
            return $scope.items && $scope.items.length && $element.is(':visible');
         }, _deferRefresh);

         function _comparator(o) {
            switch (o) {
               case 0:         return 0;
               case maxOffset: return 2;
               default:        return 1;
            }
         }
      }]
   });
});
