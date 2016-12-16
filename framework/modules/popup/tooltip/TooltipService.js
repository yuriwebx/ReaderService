/**
 * Usage:
 * 
 *   <ANY sw-tooltip="key.to.lang.resources"> - interpolation {{...}} allowed 
 *   
 *   <ANY sw-tooltip-options="expr-resolved-to-object">
 *   <ANY sw-tooltip-options="{
 *      text: 'key.to.lang.resources', // or function that returns key
 *      layout: {my: 'RC', at: 'LC'    // see PopupService.js for "layout" description
 *   }}">
 *      
 *   swTooltipService.tooltip($element, {text: ...});
 *   swTooltipService.tooltip($element, {text: ..., layout: {...}});
 * 
 */
define([

   'module',
   'underscore',
   'swLoggerFactory',
   'swServiceFactory',
   'text!./Tooltip.html',
   'less!./Tooltip'

   ], function(

   module,
   _,
   swLoggerFactory,
   swServiceFactory,
   content

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   swServiceFactory.create({
      module: module,
      service: ['swPopup', function(swPopup)
      {
         this.tooltip = function(element, options)
         {
            _tooltip(element, options);
         };
         
         function _tooltip(element, options)
         {
            var popup;
            
            options = _.clone(options || {});
            options = _.defaults(options, {
               text: '',
               layout: {}
            });

            element.addClass('sw-popup-backdrop-events-allowed');

            element.on('mouseenter', _enter);
            element.on('mouseleave', _leave);
            
            element.on('$destroy', function()
            {
               element.off('mouseenter', _enter);
               element.off('mouseleave', _leave);
               _leave();
            });

            function _enter(event)
            {
                event = event || window.event;
                if(event.buttons || event.which)
                   return;
               _leave();
               
               var text = _.result(options, 'text');
               
               logger.trace('enter', text);
               
               if ( !text )
               {
                  return;
               }

               popup = swPopup.show({
                  extendScope: { tooltip: text, swScrollOptions: {type: 'NONE'} },
                  modal: false,
                  target: element,
                  requestFocus: false,
                  backdropEvents: true,
                  customClass: 'sw-tooltip',
                  content: content,
                  layout: _.defaults(options.layout, {
                     arrow: true,
                     my: 'CB',
                     at: 'CT',
                     of: element[0]
                  })
               });
               
               popup.readyPromise.then(function()
               {
                  if ( popup )
                  {
                     // trigger opacity transition (see Tooltip.less)
                     popup.     element[0].style.opacity = 1;
                     popup.arrowElement[0].style.opacity = 1;
                  }
               });

               popup.promise.then(_leave);
            }

            function _leave()
            {
               if ( popup )
               {
                  logger.trace('leave', options.text);
                  popup.hide(undefined);
                  popup = undefined;
               }
            }
         }
      }]
   });

});
