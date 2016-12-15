/**

   Directive-wrapper for base input components.
   
   Usage:
   
      <sw-input name="const" ... ></sw-input>
      <sw-input sw-name="expr" ... ></sw-input>
      
      <sw-input type="const" ... ></sw-input>
      <sw-input sw-type="expr" ... ></sw-input>
      
      Closing tag is mandatory.
      
      Expression specified in 'sw-name' attribute is being watched and
      input is recreated accordingly.
      If both attributes (name and sw-name) are specified then 'sw-name'
      has precedence over 'name'.
      
      Expression specified in 'sw-type' attribute is being watched and
      input is recreated accordingly.
      If both attributes (type and sw-type) are specified then 'sw-type'
      has precedence over 'type'.
   
      Note that this directive was developed before angular introduced
      the possibility to interpolate name and type attributes.
      See https://github.com/angular/angular.js/issues/1404
            
   The following types are supported:
   
      - autogrowtextarea   (sw custom)
      - button
      - checkbox
      - date               (native or custom, see below)
      - hidden
      - mask               (3rd party with sw enhancements)
      - number             (native with sw enhancements)
      - password
      - radio
      - select
      - select2            (3rd party with sw enhancements)
      - sw-date            (sw custom)
      - sw-time            (sw custom)
      - text
      - textarea
      - time               (native or custom, see below)
      
   For date/time, concrete implementation is selected at runtime:
      - for desktop, sw custom date/time inputs used, 
      - otherwise native ones.
   
   For each type, template exists in current folder (see *.html files)
   
   Directive is processed in the following way:
   
      - <sw-input>...</sw-input> is extracted from DOM as html text
      - <sw-input> is replaced with appropriate tag name
      - template for specified type is given
      - in template, '<input-placeholder/>' substring is replaced with the string got on step 2
      - template is inserted to DOM instead of original element
      - class 'sw-input-<type>-wrapper' is added to this inserted DOM element
      - classes 'sw-input' and 'sw-input-<type>' are added to <input> in this inserted DOM element
      - angular compiler is invoked on this inserted DOM element

   Additionally, data property 'sw-input-wrapper' of input element is set to wrapper element.
   It is useful in case if we have to control the behavior and/or appearance of the whole input
   template on the input element level. See, for example, Number.js.
   
   Besides the uniform <input type=""> way, the following synonym directive
   are also created in this module:
   
      <sw-button>
      <sw-textarea>
      <sw-autogrowtextarea>
      <sw-select>
      <sw-select2>
      
   See also:
      - pl/component/commons/input/AutogrowTextarea
      - pl/component/commons/input/Select2
      - pl/component/test/testinput
   
*/
define([

   'module',
   'angular',
   'ngModule',
   'swLoggerFactory',
   'text!./autogrowtextarea.html',
   'text!./button.html',
   'text!./checkbox.html',
   'text!./date.html',
   'text!./hidden.html',
   'text!./mask.html',
   'text!./number.html',
   'text!./password.html',
   'text!./radio.html',
   'text!./select.html',
   'text!./select2.html',
   'text!./text.html',
   'text!./textarea.html',
   'text!./time.html',
   'text!./switcher.html',
   'less!./Input',
   'less!./button',
   'less!./radio',
   'less!./checkbox',
   'less!./autogrowtextarea',
   'less!./select2',
   'less!./switcher',
   'less!./number'

   ], function(

   module,
   ng,
   ngModule,
   swLoggerFactory,
   autogrowtextareaTemplate,
   buttonTemplate,
   checkboxTemplate,
   dateTemplate,
   hiddenTemplate,
   maskTemplate,
   numberTemplate,
   passwordTemplate,
   radioTemplate,
   selectTemplate,
   select2Template,
   textTemplate,
   textareaTemplate,
   timeTemplate,
   switcherTemplate

   ){

   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   /////////////////////////////////////////////////////////////
   
   ngModule.directive('swInput', ['$parse', '$compile', 'swFeatureDetector', function($parse, $compile, swFeatureDetector)
   {
      logger.trace('register sw-input');
      return {
         restrict: 'E',
         priority: 500,
         terminal: true,
         link: function(scope, element)
         {
            element.removeAttr('ng-repeat');
            // 'ng-repeat' priority is 1000 and so, if it is specified on 'sw-input',
            // it would be processed twice since below, in _process(), we $compile
            // html code extracted from DOM which contains all the specified attributes.
            
            ///////////////////////////////////////////////////////////////////
            
            // Note that this directive was developed before angular introduced
            // the possibility to interpolate name and type attributes.
            // See https://github.com/angular/angular.js/issues/1404
            
            var swName = element.attr('sw-name');
            var name = element.attr('name');
            element.removeAttr('sw-name');
            
            var swType = element.attr('sw-type');
            var type = element.attr('type');
            element.removeAttr('sw-type');
            
            var nameFn = swName ? $parse(swName) : function() { return name; };
            var typeFn = swType ? $parse(swType) : function() { return type; };
            
            function watchFn(scope)
            {
               var name = nameFn(scope);
               var type = typeFn(scope);
               var unwatch = !swName && !swType;
               
///////////////////////////////////////////////////////////////////////////////
//
// Input Type Discriminator
//               
// Consider extracting to separate service in case if the algorithm/rules
// becomes more complex.
//               
// If algorithm/rules needed all-time watching then set "unwatch = false;"  
//
///////////////////////////////////////////////////////////////////////////////
//
// For desktop, use our custom date/time inputs, 
// otherwise use native ones.
//             
               if ( type === 'date' && swFeatureDetector.isDesktop() )
               {
                  type = 'sw-date';
               }
               if ( type === 'time' && swFeatureDetector.isDesktop() )
               {
                  type = 'sw-time';
               }
//               
///////////////////////////////////////////////////////////////////////////////
               
               return {
                  name: name,
                  type: type,
                  unwatch: unwatch
               };
            }
            
            var origElement = element;
            var prevElement = element;
            var unwatchFn = scope.$watchCollection(watchFn, function(obj)
            {
               origElement.attr('name', obj.name);
               prevElement = _processInput($compile, scope, origElement, prevElement, obj.type, swFeatureDetector);
               if ( obj.unwatch )
               {
                  unwatchFn();
               }
            });
            
         }
      };
   }]);
   
   
   /////////////////////////////////////////////////////////////
   
   ngModule.directive('swTextarea', ['$compile', function($compile)
   {
      logger.trace('register sw-textarea');
      return {
         restrict: 'E',
         priority: 500,
         terminal: true,
         link: function(scope, element)
         {
            _process($compile, scope, element, element, 'textarea', 'sw-textarea', 'textarea');
         }
      };
   }]);

   /////////////////////////////////////////////////////////////
   
   ngModule.directive('swAutogrowtextarea', ['$compile', function($compile)
   {
      logger.trace('register sw-autogrowtextarea');
      return {
         restrict: 'E',
         priority: 500,
         terminal: true,
         link: function(scope, element)
         {
            _process($compile, scope, element, element, 'autogrowtextarea', 'sw-autogrowtextarea', 'textarea');
         }
      };
   }]);

   /////////////////////////////////////////////////////////////
   
   ngModule.directive('swButton', ['$compile', function($compile)
   {
      logger.trace('register sw-button');
      return {
         restrict: 'E',
         priority: 500,
         terminal: true,
         link: function(scope, element)
         {
            // type="button" is set explicitly to avoid 'click' triggering on Enter key
            // http://stackoverflow.com/questions/4763638/enter-triggers-button-click
            _process($compile, scope, element, element, 'button', 'sw-button', 'button', 'button');
         }
      };
   }]);

   /////////////////////////////////////////////////////////////
   
   ngModule.directive('swSelect', ['$compile', function($compile)
   {
      logger.trace('register sw-select');
      return {
         restrict: 'E',
         priority: 500,
         terminal: true,
         link: function(scope, element)
         {
            _process($compile, scope, element, element, 'select', 'sw-select', 'select');
         }
      };
   }]);

   /////////////////////////////////////////////////////////////
   
   ngModule.directive('swSelect2', ['$compile', function($compile)
   {
      logger.trace('register sw-select2');
      return {
         restrict: 'E',
         priority: 500,
         terminal: true,
         link: function(scope, element)
         {
            _process($compile, scope, element, element, 'select2', 'sw-select2', 'input', 'hidden');
         }
      };
   }]);

   /////////////////////////////////////////////////////////////
   
   var typeToTemplate = {
         'autogrowtextarea': autogrowtextareaTemplate,
         'button': buttonTemplate,
         'checkbox': checkboxTemplate,
         'date': dateTemplate,
         'hidden': hiddenTemplate,
         'mask': maskTemplate,
         'number': numberTemplate,
         'password': passwordTemplate,
         'radio': radioTemplate,
         'select': selectTemplate,
         'select2': select2Template,
         'text': textTemplate,
         'textarea': textareaTemplate,
         'time': timeTemplate,
         'switcher': switcherTemplate
   };
   
   var inputPlaceholder = '<input-placeholder/>';
   var swInputClass = 'sw-input';
   
   function _processInput($compile, scope, origElement, prevElement, type, swFeatureDetector)
   {
      type = (type || 'text').toLowerCase();

      var tag;
      var attr;
      
      switch ( type )
      {
         case 'date':
            tag = 'input';
            attr = swFeatureDetector.isDateInputTypeSupported() ? 'date' : 'text';
            break;
         case 'time':
            tag = 'input';
            attr = swFeatureDetector.isTimeInputTypeSupported() ? 'time' : 'text';
            break;
         case 'sw-date':
            tag = 'sw-date-input';
            type = 'date';
            break;
         case 'sw-time':
            tag = 'sw-time-input';
            type = 'time';
            break;
         case 'mask':
            tag = 'input';
            attr = 'text';
            break;
         case 'number':
            tag = 'input';
            attr = 'text';
            break;
         case 'textarea':
            tag = 'textarea';
            break;
         case 'autogrowtextarea':
            tag = 'textarea';
            break;
         case 'select':
            tag = 'select';
            break;
         case 'select2':
            tag = 'input';
            attr = 'hidden';
            break;
         case 'switcher':
            tag = 'button';
            break;
         default:
            tag = 'input';
            attr = type;
            break;
      }
      
      prevElement = _process($compile, scope, origElement, prevElement, type, 'sw-input', tag, attr);
      return prevElement;
   }
   
   function _process($compile, scope, origElement, prevElement, type, tagFrom, tagTo, typeAttr)
   {
      origElement.addClass(swInputClass);
      
      origElement.removeAttr('type');
      if ( typeAttr )
      {
         origElement.attr('type', typeAttr);
      }
      
      var inputHtml = origElement[0].outerHTML;
         // other way how to get outerHTML: element.clone().wrap('<p>').parent().html();
      
      inputHtml = inputHtml.replace('<'  + tagFrom, '<'  + tagTo);
      inputHtml = inputHtml.replace('</' + tagFrom, '</' + tagTo);
      
      var template = typeToTemplate[type];
      if ( !template )
      {
         throw new Error('<sw-input>: unknown type "' + type + '"');
      }
      
      template = template.replace(inputPlaceholder, inputHtml);
      
      var newElement = ng.element(template);
      newElement.addClass('sw-input-wrapper');
      newElement.addClass('sw-input-' + type + '-wrapper');
      
      var inputElement = _findInputIn(newElement);
      inputElement.addClass('sw-input-' + type);
      
      inputElement.data('sw-input-wrapper', newElement);
      // 'sw-input-wrapper' is needed for other directives which have to control this input.
      // In case when input updates DOM around itself (select2 etc) we need an element that
      // wraps all the DOM related to this input.
      
      prevElement.replaceWith(newElement);
      
      $compile(newElement)(scope);
      
      return newElement;
   }
   
   function _findInputIn(elem)
   {
      if ( !elem.hasClass(swInputClass) )
      {
         elem = elem.find('.' + swInputClass);
      }
      if ( elem.length === 0 )
      {
         throw new Error('<sw-input>: template should contain' + inputPlaceholder);
      }
      return elem;
   }

});
