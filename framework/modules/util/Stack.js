define(
   ['module', 'ngModule', 'swLoggerFactory'],
function
   ( module,   ngModule,   swLoggerFactory )
{
   'use strict';
      
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.factory('swStack', [function()
   {
      logger.trace('register');

      function Stack()
      {
         var stack = [];
         var len = 0;
         
         this.push = function(item)
         {
            stack[len++] = item;
         };
         
         this.pop = function()
         {
            return stack[--len];
         };
         
         this.peek = function()
         {
            return stack[len - 1];
         };
         
         this.byIndex = function(index)
         {
            if ( index >= 0 && index < len )
            {
               return stack[index];
            }
         };
         
         this.len = function()
         {
            return len;
         };
      }
      
      // public static
      Stack.createInstance = function()
      {
         return new Stack();
      };
      
      return Stack;
   
   }]);

});
