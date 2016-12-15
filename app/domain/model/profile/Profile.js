define([
   
   'swEntityFactory'
   
   ], function(

   swEntityFactory

   ){
   
      'use strict';
   
      swEntityFactory.register('Profile', ['Entity', function(Entity)
      {

         function Profile()
         {

        Entity.apply(this, arguments);
        this.firstName = this.firstName || "";
        this.lastName = this.lastName || "";
         }

    Profile.prototype = new Entity();


    return Profile;
      }]);
    }
);