/**
 * swLayoutManager aggregates layout related events and provides interested parties with
 * an API to access specific layout context information (see below).
 * 
 * The following events are aggregated:
 * 
 *    - resize
 *    - orientationchange
 *    - scroll
 *    - angular digest
 *    - custom (see below)
 *    
 * These events are being accumulated until there are no such events within last 100ms.
 * Then all registered parties (layouters) are invoked.   
 * 
 * Register layouter 
 *    swLayoutManager.register({
 *       id:     // identifier 
 *       layout: // function myLayouter(context) { ... }
 *    });
 *              
 * Unregister layouter
 *    swLayoutManager.unregister(id);
 *
 * Trigger custom layout event
 *    swLayoutManager.layout('customEventName');
 *
 * Get current layout context
 * Note that context got in such a way contains "initiating" event only: {events: {initiating: true}}
 * In particular, see "swLayout" comments in ComponentAugmenter.js
 *    swLayoutManager.context();
 * 
 * Layouters are invoked with one arg - layout context.
 * It is an on object of the following structure: 
 *              
 *    $ // jQuery object (just for convenience)
 *    oldViewport: {width: ..., height: ...},
 *    viewport:    {width: ..., height: ...},
 *    media: ... // swMediaDetector.detect();
 *    touch: ... // swFeatureDetector.isTouchInput();
 *    events: {  // boolean flags
 *       initiating
 *       resizing
 *       orienting
 *       scrolling
 *       digest
 *       customEventName
 *    }
 *
 * As all registered layouters are always invoked on any layouting related event
 * (in particular, scrolling, digest etc) it is recommended to perform layouting
 * code only for needed events for each particular case. For example:  
 *
 *    $scope.swLayout = function(context)
 *    {
 *       if ( context.events.initiating ||
 *            context.events.resizing   ||
 *            context.events.orienting  ||
 *            context.events.swToolbarVisibilityChanged )
 *       {
 *          ...
 *       }
 *    };
 *
 * See also: "swLayout" processing in ComponentAugmenter.js.
 */
define([

   'module',
   'underscore',
   'jquery',
   'angular',
   'ngModule',
   'swLoggerFactory'

   ], function(

   module,
   _,
   $,
   ng,
   ngModule,
   swLoggerFactory

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.service('swLayoutManager', [
                                        
      '$window',
      '$rootScope',
      'swMediaDetector',
      'swFeatureDetector',
      'swApplicationScroll',
      
   function(
         
      $window,
      $rootScope,
      swMediaDetector,
      swFeatureDetector,
      swApplicationScroll
      
   )
   {
      logger.trace('register');
      
      var _this = this;
      var _win = $($window);
      var _layouters = [];
      var _events = {};
      
      var _context = // must be clonable
      {
         viewport: {}
      };
      
      var _contextExtent =
      {
         $: $
      };
      
      this.register = function(layouter)
      {
         logger.trace('register', layouter.id);
         _layouters.push(layouter);
      };
      
      this.unregister = function(id)
      {
         logger.trace('unregister', id);
         _layouters = _.reject(_layouters, function(layoter)
         {
            return layoter.id === id;
         });
      };
      
      this.layout = function(event)
      {
         _events[event || '?'] = true;
         _layout();
      };
      
      this.context = function()
      {
         var context = _.extend(ng.copy(_context), _contextExtent);
         context.events = {initiating: true};
         return context;
      };
      
      function _updateContext()
      {
         _context.oldViewport = {
            width:  _context.viewport.width  || 0,
            height: _context.viewport.height || 0
         };
         _context.viewport.width  = _win.outerWidth();
         _context.viewport.height = _win.outerHeight();
         _context.media = swMediaDetector.detect();
         _context.touch = swFeatureDetector.isTouchInput();
         _context.scrollTop = swApplicationScroll.getScrollTop();
         return _this.context();
      }
      
      var _layout = _.debounce(function()
      {
         var context = _updateContext();
         context.events = _.clone(_events);
         _events = {};
         
         logger.trace('layout', context);
         
         _.each(_layouters, function(layouter)
         {
            layouter.layout(context);
         });
         
      }, 100);

      _updateContext();
      
      _win.on('resize', function() {
         _events.resizing = true;
         _layout();
      });

      swApplicationScroll.addListener(function() {
         _events.scrolling = true;
         _layout();
      });

      _win.on('orientationchange', function() {
         // http://stackoverflow.com/questions/11444838/getting-wrong-screen-height-when-trigger-orientationchange-event
         _win.one('resize', function() {
            _events.orienting = true;
            _layout();
         });
      });
      
      $rootScope.$watch(function() {
         _events.digest = true;
         _layout();
      });
      
   }]);

});
