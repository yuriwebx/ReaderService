define([
   
   'swEntityFactory'
   
   ], function(

   swEntityFactory

   ){
   
      'use strict';
   
      swEntityFactory.register('UserSession', ['Entity', function(Entity)
      {

         function UserSession()
         {
            Entity.apply(this, arguments);
         }
      
      UserSession.prototype = new Entity();
        
      return UserSession;
    }]);
   }
);