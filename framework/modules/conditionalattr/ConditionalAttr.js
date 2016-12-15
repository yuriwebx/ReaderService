/*
 Usage:

 - set some attribute to an element conditionally:
 <some-element conditional-attr="{'attrName': 'name', 'condition': 'boolean'}"></some-element>

 - set few attributes to an element conditionally:
 <some-element conditional-attr="{'attrName': 'name', 'condition': 'boolean'}, {'attrName': 'name', 'condition': 'boolean'}"></some-element>

 */

define([

   'module',
   'ngModule',
   'swLoggerFactory'

], function(

    module,
    ngModule,
    swLoggerFactory

    ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   ngModule.directive('conditionalAttr', [
      function ()
      {
         return {
            restrict: 'A',
            link: function(scope, element, attr)
            {
               /*jshint unused:false */

               var _attr = attr.conditionalAttr,
                   regEx = /{[^}]+}/g,
                   conditionsArr = _attr.match(regEx),
                   _item;

               conditionsArr.forEach(function (item) {
                  _item = JSON.parse(item.replace(/'/g , "\""));

                  if ( _item.condition === 'true' )
                  {
                     element[0].setAttribute(_item.attrName, '');
                  }
                  else
                  {
                     element[0].removeAttribute(_item.attrName);
                  }
               });
            }
         };
      }]);

});
