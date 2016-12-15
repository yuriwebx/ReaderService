/**
   
   Angular directive which enhances textarea with autogrow
   functionality using 3rd party plugin.
      Autogrow Textarea Plugin Version v3.0
      http://www.technoreply.com/autogrow-textarea-plugin-3-0
      THIS PLUGIN IS NOT SUPPORTED ANYMORE.
      ITS CODE IS RE-FACTORED AND INCLUDED DIRECTLY HERE (see below).
      
   Note that this directive is class-restricted.
    
   Usage:
      <textarea class="sw-input-autogrowtextarea"></textarea>
      <sw-autogrowtextarea></sw-autogrowtextarea>
      <sw-input type="autogrowtextarea"></sw-input>
   
*/
define([


   'module',
   'ngModule',
   'underscore',
   'swLoggerFactory'

   ], function(

   module,
   ngModule,
   _,
   swLoggerFactory

   ){
   
   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ////////////////////////////////////////////////////////////////////////////
   
   var MIRROR_CLASSNAME = 'autogrow-textarea-mirror';

   // Based on:
   // Autogrow Textarea Plugin Version v3.0
   // http://www.technoreply.com/autogrow-textarea-plugin-3-0

   var _createMirror = function($element)
   {
      $element.after('<div class="' + MIRROR_CLASSNAME + '"></div>');
      var $mirror = $element.next('.' + MIRROR_CLASSNAME);
      
      var element = $element[0];
      var mirror  = $mirror[0];

      mirror.style.display         = 'none';
      mirror.style.wordWrap        = $element.css('word-wrap');
      mirror.style.borderStyle     = 'solid';
      mirror.style.borderWidth     = $element.css('border-top-width') + ' ' +      // in Firefox properties like margin, padding, border etc. is empty string
                                       $element.css('border-right-width') + ' ' +  // bug report https://bugzilla.mozilla.org/show_bug.cgi?id=381328
                                       $element.css('border-bottom-width') + ' ' +
                                       $element.css('border-left-width');

      mirror.style.boxSizing       = $element.css('box-sizing');
      mirror.style.whiteSpace      = $element.css('white-space');
      mirror.style.padding         = $element.css('paddingTop') + ' ' +
                                       $element.css('paddingRight') + ' ' +
                                       $element.css('paddingBottom') + ' ' +
                                       $element.css('paddingLeft');

      mirror.style.width      = $element.css('width');
      mirror.style.fontFamily = $element.css('font-family');
      mirror.style.fontSize   = $element.css('font-size');
      mirror.style.lineHeight = $element.css('line-height');
      mirror.style.fontWeight = $element.css('font-weight');

      element.style.overflow  = 'hidden';
      element.style.resize    = 'none';
      element.style.minHeight = $element.rows + 'em';

      return function() // synchronize element to mirror
      {
         $mirror[0].innerHTML = String($element[0].value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '.<br />.') + '.'; // Support special characters. Removing extra line in the end
         
         if ( $element.width() !== $mirror.width() )
         {
            $mirror.width($element.width());
         }

         if ( $element.height() !== $mirror.height() )
         {
            $element.height($mirror.height());
         }
      };
   };

   function _removeMirror($element)
   {
      $element.next('.' + MIRROR_CLASSNAME).remove();
   }

   ////////////////////////////////////////////////////////////////////////////
   
   ngModule.directive('swInputAutogrowtextarea', ['swLayoutManager', function(swLayoutManager)
   {
      logger.trace('register');
      
      return {
         restrict: 'C',
         require: 'ngModel',
         link: function(scope, element, attr, ctrl)
         {
            /*jshint unused:true */
            
            if ( !element.is('textarea') )
            {
               throw new Error('\'sw-input-autogrowtextarea\' directive is applicable to "textarea" only');
            }

            element.attr('ng-attr-rows', 1);
            
            var sync;

            function _reinitMirrorAndSync()
            {
               _removeMirror(element);
               sync = _createMirror(element);
               sync();
            }

            _reinitMirrorAndSync();

            function _layout(ctx)
            {
               if ( ctx.events.orienting || ctx.events.resizing )
               {
                  _reinitMirrorAndSync();
               }
            }

            var id = _.uniqueId('swInputAutogrowtextarea:');
            swLayoutManager.register({
               id: id,
               layout: _layout
            });
            
            var clearElement = element
               .parent('.sw-input-autogrowtextarea-wrapper')
               .find  ('.sw-input-autogrowtextarea-clear');
            
            clearElement.click(function()
            {
               scope.$apply(function()
               {
                  element.val('');
                  ctrl.$setViewValue('');
               });
               _.defer(function()
               {
                  sync();
                  clearElement.hide();
                  element.focus();
               });
            });
            
            ctrl.$formatters.push(function(value)
            {
               _.defer(function()
               {
                  sync();
                  clearElement.toggle(!!value);
               });
               return value;
            });
                  
            element.on('input', function()
            {
               sync();
               clearElement.toggle(!!element.val());
            });
            
            element.on('$destroy', function() {
               _removeMirror(element);
               swLayoutManager.unregister(id);
            });
         }
      };
   }]);
});
