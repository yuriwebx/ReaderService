define([
   
   'swEntityFactory'
   
   ], function(

   swEntityFactory

   ){
   
      'use strict';
   
      swEntityFactory.register('LanguageResources', ['Entity', function(Entity)
      {

         function LanguageResources()
         {
            Entity.apply(this, arguments);
         }
      
      LanguageResources.prototype = new Entity();
        
      return LanguageResources;
    }]);
   }
);