/**
 * Created by shao on 18.07.14.
 */
define([
   'module',
   'swServiceFactory'
], function(module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : [
      function() {

//         this.clearDB = function()
//         {
//            return IndexedDBProvider.removeDatabase();
//         };

      }]
   });
});