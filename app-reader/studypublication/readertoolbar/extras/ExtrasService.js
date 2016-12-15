define(['module', 'underscore','swServiceFactory'], function(module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['swSubmachine', function(swSubmachine) {

         this.isExtrasOpened = function()
         {
            var stack = swSubmachine.getStack();
            return _.contains(['StudyContent', 'BookInfo', 'Annotations', 'Exercises'], _.last(stack).currState);
         };

      }]
   });
});