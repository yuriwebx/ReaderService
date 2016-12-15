define([

   'module', 'ngModule', 'swLoggerFactory', 'underscore'
   
   ], function(

    module,   ngModule,   swLoggerFactory,   _
   
   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   /**
    * Mask formatter for phone, zip, ssn, etc.
    * where: a - Letters in range [A..Z] and [a..z]
    *        9 - Digits  in range [0..9]
    *        * - Digits or Letters as above
    * usage:
    *        var zip = 'K1A0B1';
    *        var mask = swMaskFormatter.getFormatter('a9a-9a9');
    *        mask(zip); //K1A-0B1
    * if unmasked value is empty, or does not correspond to the given mask unmasked itself is returned.
    * if unmasked is smaller than the mask, spaces will be put instead of a/9.
    */
   ngModule.factory('swMaskFormatter', [function()
   {
      logger.trace('register');

      var placeholder = {'a': new RegExp('[A-Za-z\\*]'),
                         '9': new RegExp('[0-9\\*]'),
                         '*': new RegExp('[A-Za-z0-9\\*]')
                         };
      
      function MaskFormatter()
      {
         
         this.getFormatter = function(mask)
         {
            var _mask =  mask.split('');
            
            return function(unmasked)
            {
               var res = '', _unmasked;
               
               if(!unmasked || !_.isString(unmasked) ||
                     unmasked === '')
               {
                  return unmasked;
               }
               
               _unmasked = unmasked.split('');
               
               for (var i = 0, j = 0; i < _mask.length; i++)
               {
                  if (placeholder[_mask[i]])
                  {
                     if (j < _unmasked.length)
                     {
                        if (placeholder[_mask[i]].test(_unmasked[j]))
                        {
                           res += _unmasked[j++];
                        }
                        else
                        {
                           return unmasked;
                        }
                     }
                     else
                     {
                        res += ' ';
                     }
                  }
                  else
                  {
                     res += _mask[i];
                  }
               }
               
               return res;
            };
         };
      }
      
      return new MaskFormatter();
   }]);
});