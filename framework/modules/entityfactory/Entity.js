/**
 * Base prototype for all subject domain entities.
 *
 * Pay attention to 'update' method below.
 *
 */
define([

   'underscore',
   'swEntityFactory'

   ], function(

   _,
   swEntityFactory
   
   ){

   'use strict';
   
   swEntityFactory.register('Entity', [function()
   {
      
      var _permanent = {};

      function Entity(obj)
      {
         _.extend(this, obj);
      }

      /**
       * Set property in such a way it can not be deleted by 'update' method
       */
      Entity.prototype.set = function(key, value)
      {
         this[key] = value;
         _permanent[key] = true;
      };
      
      /**
       * Update this entity with the content of another entity.
       * If source={a: 'a', b: 'b1'} and dest={b: 'b2', c: 'c'}
       * source.update(dest)={b: 'b2', c: 'c'}
       * a will be deleted, b updated, and c added.
       * If child property is an Entity itself update() will be called for it.
       * If child property is an Array, it will be emptied and then new elements will be pushed to it.
       * It allows to keep references to this entity
       * actual even in cases when it should be replaced with newly created one.
       * Such an approach allows to have truly sharable models.
       */
      Entity.prototype.update = function(source)
      {
         var pName, thisProp, sourceProp;
         
         //delete obsolete attributes
         for (pName in this)
         {
            if (!_permanent[pName] && this.hasOwnProperty(pName) && !source[pName] && typeof this[pName] !== 'function')
            {
               delete this[pName];
            }
         }

         //add/update attributes
         for (pName in source)
         {
            if (source.hasOwnProperty(pName))
            {
               thisProp = this[pName];
               sourceProp = source[pName];
               
               if (thisProp instanceof Entity)
               {
                  thisProp.update(sourceProp);
               }
               else if (_.isArray(thisProp))
               {
                  thisProp.splice(0);
                  for (var i = 0; i < sourceProp.length; i++)
                  {
                     thisProp.push(sourceProp[i]);
                  }
               }
               else
               {
                  this[pName] = sourceProp;
               }
            }
         }
      };
      
      return Entity;
      
   }]);
});