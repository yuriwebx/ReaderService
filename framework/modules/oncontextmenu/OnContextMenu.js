/**

   Usage:
      <some-element sw-on-context-menu="expr">
      
   Evaluate specified expression when user performs
   - specific mouse action ("right-click" on windows)
   - specific tap action on touch device ("hold" or "longtap")
    
   Please note that variable with name "offset" can be used in "expr".
   
   For example,
   
   in template:
   <div sw-on-context-menu="contextMenu(offset)">
   
   in controller:
   $scope.contextMenu = function(offset)
   {
      alert(offset.clientX + ' ' + offset.clientY);
      // offset.target (got from event.target) is also available
   };

*/

define([

   'module',
   'underscore',
   'ngModule',
   'hammer',
   'swLoggerFactory'
   
   ], function(

   module,
   _,
   ngModule,
   Hammer,
   swLoggerFactory
   
   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.directive('swOnContextMenu', ['$window', '$parse', function($window, $parse)
   {
      logger.trace('register');
   
      /////////////////////////////////////////////////////////////////////////
      
      var _skipFlag; // see _pressHandler below
      
      function _skipHandler(event)
      {
         if ( _skipFlag )
         {
            logger.trace('skip', event.type);
            
            event.stopImmediatePropagation();
            event.stopPropagation();
            event.preventDefault();
            
            _skipFlagClear();
         }
      }
      
      var _skipFlagClear = _.debounce(function()
      {
         logger.trace('skip clear');
         _skipFlag = false;
      }, 100);
                  
      $window.addEventListener('click',    _skipHandler, true);
      $window.addEventListener('mouseup',  _skipHandler, true);
      $window.addEventListener('touchend', _skipHandler, true);
      
      /////////////////////////////////////////////////////////////////////////
      
      return {
         restrict: 'A',
         link: function(scope, element, attr)
         {
            var fn = $parse(attr.swOnContextMenu);

            element.on('contextmenu', function(event)
            {
               event.preventDefault();
               event.stopPropagation();

               var offset = {offset: {clientX: event.clientX, clientY: event.clientY}};
               _pressHandler(event, offset);
            });
            
            var hammerManager = new Hammer.Manager(element[0]);
            hammerManager.add(new Hammer.Press());
            hammerManager.on('press', function(event)
            {
               var offset = {offset: {clientX: event.center.x, clientY: event.center.y}};
               _pressHandler(event, offset);
            });
            
            function _pressHandler(event, offset)
            {
               if ( !_skipFlag )
               {
                  scope.$apply(function()
                  {
                     logger.trace(event.type, offset);
                     offset.offset.target = event.target;
                     fn(scope, offset);
                  });
                  
                  if ( event.button !== 2 ) // skip desktop right button click 
                  {
                     // "press" event is triggered when user holds for some time his finger on screen.
                     // Then, when he takes his finger away from screen, "click" event is triggered
                     // which is unwanted.
                     
                     // another problem is that, on Android, "contextmenu" event is generated natively
                     // when user holds his finger (slightly later than hammer "press" event).
                     
                     // The below flag is introduced to resolve both problems. 
                     
                     _skipFlag = true;
                  }
               }
               else
               {
                  logger.trace('skip', event.type);
               }
            }
            
         }
      };
   }]);

});
