define([

   'module',
   'fastclick',
   'jquery',
   'ngModule',
   'swLoggerFactory'

   ], function(

   module,
   FastClick,
   $,
   ngModule,
   swLoggerFactory

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.run(['$window', function($window)
   {
      logger.trace('run');
      
      /////////////////////////////////////////////////////////////////////////

      // FastClick does not process events on elements marked with 'needsclick' class.
      // It's not convenient for complex 3rd-party DOM structures, like Select2.
      // To workaround it we override appropriate FastClick method. 
      
      var needsClick = FastClick.prototype.needsClick;
      FastClick.prototype.needsClick = function(target)
      {
         return needsClick.apply(this, arguments) ||
            target.tagName.toLowerCase() === 'select' || // Android/Firefox issue
            $(target).closest('.sw-input-select2-wrapper').length;
      };

      /////////////////////////////////////////////////////////////////////////
      
      // FastClick is not activated for platforms which do not introduce 300ms delay.
      // In particular, it is the Chrome on Android with user-scalable="no".
      // But really some delay between 'touchend' and 'click' (~200ms) does still exist
      // and wanted to be avoided.
      // To workaround it we override appropriate FastClick method. 

      FastClick.notNeeded = function()
      {
         return false;
      };

      /////////////////////////////////////////////////////////////////////////

      // Activate FastClick
      
      FastClick.attach($window.document.body);

      /////////////////////////////////////////////////////////////////////////

   }]);
      
});