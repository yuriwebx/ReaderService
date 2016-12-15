/* jshint browser:true */
define([
   'module',
   'underscore',
   'ngModule',
   'swLoggerFactory'
], function(
   module,
   _,
   ngModule,
   swLoggerFactory
) {
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.factory('swScrollAnimator', _.constant(ScrollAnimator));

   function ScrollAnimator(strategy, _setScrollTop)
   {
      var api = this;
      /* --- api --- */
      api.animate    = animate;
      api.inProcess  = inProcess;
      api.stop       = stop;
      api.getDestination = getDestination;

      /* === impl === */
      var rAF           = _getRAF(),
          _startTime    = 0,
          _easingFn,
          _destination,
          _destinationTime,
          _startPosition,
          _isAnimating;

      function getDestination()
      {
          return _destination;
      }

      function inProcess()
      {
         return _isAnimating;
      }

      function stop()
      {
         _isAnimating = false;
      }

      function animate(destination, duration, easingFn)
      {
         _easingFn       = easingFn || _.identity;
         _destination    = destination;
         _startPosition  = strategy.getScrollTop();
         if (_isAnimating)
         {
            _destinationTime = _now() + duration;
         }
         else
         {
            _isAnimating = true;
            _startTime = _now();
            _destinationTime = _startTime + duration;
            rAF(step);
         }
      }

      function step(now)
      {
         if ( !_isAnimating )
         {
            return;
         }

         now = (_startTime % 1 !== 0) ? Math.max(now, _startTime) : _now();
         var newX, easing;
         if ( now >= _destinationTime )
         {
            _isAnimating = false;
            _setScrollTop(_destination);
            return;
         }

         easing = _easingFn(( now - _startTime ) / (_destinationTime - _startTime));
         newX = ( _destination - _startPosition ) * easing + _startPosition;
         _setScrollTop(newX);
         rAF(step);
      }
   }

   ScrollAnimator.prototype.linearFn   = _.identity;
   ScrollAnimator.prototype.circular   = circular;
   ScrollAnimator.prototype.quadratic  = quadratic;

   var _RAFs = ['requestAnimationFrame', 'webkitRequestAnimationFrame', 'mozRequestAnimationFrame',
               'oRequestAnimationFrame', 'msRequestAnimationFrame'];
   function _getRAF()
   {
      var key = _.find(_RAFs, _.propertyOf(window));
      return key ? window[key] : function (callback) { window.setTimeout(callback, 1000 / 60); };
   }

   function quadratic(k)
   {
      return k * ( 2 - k );
   }

   function circular(k)
   {
      return Math.sqrt( 1 - ( --k * k ) );
   }

   function _now()
   {
      return _.result(window, 'performance.now') || Date.now();
   }
});
