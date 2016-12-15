define([
   
   'swEntityFactory'
   
   ], function(

   swEntityFactory

   ){
   
      'use strict';
   
      swEntityFactory.register('BookView', ['Entity', function(Entity)
      {

         function BookView()
         {
            Entity.apply(this, arguments);
         }
      
      BookView.prototype = new Entity();
        
      return BookView;
    }]);
   }
);