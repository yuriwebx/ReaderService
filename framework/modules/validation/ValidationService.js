/**
 * Validation Infrastructure is build on the top of Angular one
 * and enhances it in the following directions:
 * - validation context notion
 * - validation constraints generalization
 * - validation results visualization
 *
 * To be validatable input element should:
 * - be inside 'form' or 'ng-form',
 * - have 'name' attribute (see Input.js, 'name' or 'sw-name'),
 * - be provided with validation constraints (or tokens) via appropriate directive (see Validate.js),
 * - be linked to label and/or error elements to visualize validation state (see ForName.js)
 *
 * Validation constraints (or tokens) for the given input are specified as an object.
 * Each property of this object specifies one constraint.
 * Property name is constraint type.
 * Property value is an object - constraint context.
 * Constraint context properties of different constraint types are different.
 * There are several predefined constraint types described below.
 * And one can specify any number of custom constraints.
 *
 * The following two optional constraint context properties can be specified
 * for any constraint:
 *    active  (boolean) - by default, true
 *    message (string)  - by default, constraint type
 *
 * Message is a key to language resources.
 * Real message is generated using swI18nService.getResource(message, context).
 * One can place any additional property to validation context and use it
 * for message interpolation.
 *
 * 'required' predefined constraint context properties:
 *    value  (any)     is mandatory
 *    valid  (boolean) is calculated by system
 *
 * 'maxlength' predefined constraint context properties:
 *    value  (string)  is mandatory
 *    maxlength (int)  is mandatory
 *    active (boolean) is calculated by system (maxlength > 0)
 *    valid  (boolean) is calculated by system
 * if this constraint is specified, attribute 'maxlength' is automatically set for input element
 *
 * 'number' predefined constraint context properties:
 *    value  (number)  is mandatory
 *    valid  (boolean) is calculated by system (check validity of value format)
 *
 * 'numberRange' predefined constraint context properties:
 *    value  (number)  is mandatory
 *    min    (number)  is optional
 *    max    (number)  is optional
 *    valid  (boolean) is calculated by system (check range)
 *    messageMin (string) optional - message for the case when value < min
 *    messageMax (string) optional - message for the case when value > max
 * if this constraint is specified, attributes 'min' and 'max' are automatically set for input element
 *
 * 'date' predefined constraint context properties:
 *    value  (string)  is mandatory
 *    valid  (boolean) is calculated by system (check validity of value format)
 *
 * 'dateRange' predefined constraint context properties:
 *    value  (string)  is mandatory
 *    min    (string)  is optional
 *    max    (string)  is optional
 *    valid  (boolean) is calculated by system (check range)
 *    messageMin (string) optional - message for the case when value is before min
 *    messageMax (string) optional - message for the case when value is after max
 *
 * 'future' predefined constraint context properties:
 *    value  (string)  is mandatory
 *    valid  (boolean) is calculated by system (check range)
 *
 * 'past' predefined constraint context properties:
 *    value  (string)  is mandatory
 *    valid  (boolean) is calculated by system (check range)
 *
 * 'allowedChars' predefined constraint context properties:
 *    value  (string)  is mandatory
 *    valid  (boolean) is calculated by system (check that value does not contain any of '|', '^', '~', '\', '&')
 *
 * 'alpha' predefined constraint context properties:
 *    value  (string)  is mandatory
 *    valid  (boolean) is calculated by system (check that value contains only letters a-z, A-Z)
 *
 * 'numeric' predefined constraint context properties:
 *    value  (string)  is mandatory
 *    valid  (boolean) is calculated by system (check that value contains only digits 0-9)
 *
 * 'alphanumeric' predefined constraint context properties:
 *    value  (string)  is mandatory
 *    valid  (boolean) is calculated by system (check that value contains only digits and letters 0-9, a-z, A-Z)
 *
 * 'pattern' predefined constraint context properties:
 *    value  (string)  is mandatory
 *    pattern (RegExp|string) is mandatory
 *    format (string)  is optional - for message interpolation
 *    valid  (boolean) is calculated by system (check that value matches pattern)
 *
 * custom constraint context properties:
 *    value  is optional
 *    valid  is mandatory (should be calculated by client code)
 *
 * It is not necessary to check 'active' property value in validity calculation,
 * it is processed automatically.
 *
 * For constraint 'activity' visualization, class 'sw-validation-<constraint>' is
 * toggled reflecting 'active' constraint context property 'active' state.
 *
 *
 * The following functions are intended for using in client code:
 *
 * swValidationService.setValidationMessagesEnabled(form, enabled)
 *    Use this function to control validity state visualization.
 *    By default visualization is disabled.
 *    'form' parameter should be specified as '$scope.formName' or $scope.swForm(),
 *    where 'formName' is 'ng-form' attribute value,
 *          'swForm' is function that returns the nearest (from this component and up) form.
 *    Return previous value of this flag
 *    Invoke also 'scrollFirstInvalidFieldIntoView' (see below)
 *
 * swValidationService.isValidationMessagesEnabled(form)
 *    Return flag set by 'setValidationMessagesEnabled'
 *
 * swValidationService.scrollFirstInvalidFieldIntoView(form)
 *    Perform scrolling so that top invalid field to become visible to the user.
 *    Do it only if 'isValidationMessagesEnabled'.
 *    The function is debounced by 100ms (see _.debounce()).
 *
 * swValidationService.isValid(tokens)
 * swValidationService.isInvalid(tokens)
 *    Useful if you need to validate both model and ui and reuse
 *    the same constraints specification for both cases.
 *
 */
define([
        
   'module',
   'underscore',
   'jquery',
   'ngModule',
   'swLoggerFactory'
   
],
function(
      
   module,
   _,
   $,
   ngModule,
   swLoggerFactory
   
)
{
   
   'use strict';
   
   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');
   
   ngModule.service('swValidationService', [
                                            
      '$timeout',
      '$window',
      'swI18nService',
      'swUtil',
      'swDateService',

      'swScrollFactory',
      
   function(
         
      $timeout,
      $window,
      swI18nService,
      swUtil,
      swDateService,

      swScrollFactory
      
   )
   {
      logger.trace('register');
      
      var _this = this;
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      this.setValidationMessagesEnabled = function(form, enabled)
      {
         if ( arguments.length !== 2 )
         {
            // frequent programmer mistake: specify only one boolean parameter
            throw new Error('swValidationService.setValidationEnabled: invalid usage');
         }
         
         var wasEnabled = !!form.$swValidationMessagesEnabled;
         logger.debug('setValidationMessagesEnabled', enabled, 'was:', wasEnabled);
         
         form.$swValidationMessagesEnabled = enabled;
         
         var validationMessagesEnabledClass = 'sw-validation-messages-enabled';
         var formElem = form.$swElement(); // see ScopeAugmenter#_processForm
         if ( enabled )
         {
            formElem.addClass(validationMessagesEnabledClass);
         }
         else
         {
            formElem.removeClass(validationMessagesEnabledClass);
         }
         
         this.scrollFirstInvalidFieldIntoView(form);
         
         return wasEnabled;
      };
      
      this.isValidationMessagesEnabled = function(form)
      {
         return !!form.$swValidationMessagesEnabled;
      };
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      this.scrollFirstInvalidFieldIntoView = _.debounce(function(form)
      {
         if ( _this.isValidationMessagesEnabled(form) )
         {
            $timeout(function() // let validation-related changes to be reflected to DOM
            {
               _scrollFirstInvalidFieldIntoView(form);
            });
         }
      }, 100);
            
      function _scrollFirstInvalidFieldIntoView(form)
      {
         var t1 = new Date().getTime();
         
         var elem = _findFirstInvalidElementIn(form);
         if ( elem && !_isElementInView(elem) )
         {
//            elem[0].scrollIntoView();
            var scroll = swScrollFactory.getParentScroll(elem[0]);
            scroll.scrollIntoViewIfNeeded(elem[0]);
            logger.trace('scrollFirstInvalidFieldIntoView: scrollIntoView() invoked');
         }
         
         var t2 = new Date().getTime();
         logger.trace('scrollFirstInvalidFieldIntoView:', t2 - t1, 'ms');
      }
      
      function _findFirstInvalidElementIn(form)
      {
         var elem;
         var ymin = 1e100;

         form.$swElement()
         .find('.sw-input, .sw-validation-label, .sw-validation-error')
         .filter('.ng-invalid')
         .filter(':visible')
         .each(function()
         {
            var $this = $(this);
            var y = $this.offset().top;
            logger.trace('findFirstInvalidElement:', y);
            if ( y < ymin )
            {
               ymin = y;
               elem = $this;
            }
         });
         
         return elem;
      }
      
      function _isElementInView(elem)
      {
         function _inView(ey1, ey2, py1, py2)
         {
            if ( logger.isTraceEnabled() )
            {
               logger.trace('inView:', py1.toFixed(5), (ey1 + 1).toFixed(5), '$', ey2.toFixed(5), py2.toFixed(5));
            }
            return ey1 + 1 >= py1 && ey2 <= py2;
         }
         
         var ey1 = elem.offset().top;
         var ey2 = ey1 + elem.outerHeight();
         
         var inView = _.all(elem.parents().filter(':visible'), function(p)
         {
            var $p = $(p);
            var py1 = $p.offset().top;
            var py2 = py1 + $p.outerHeight();
            return _inView(ey1, ey2, py1, py2);
         });
         
         if ( inView )
         {
            var $w = $($window);
            var py1 = $w.scrollTop();
            var py2 = py1 + $w.outerHeight() - 50;
               // margin 50 is introduced to avoid the case when
               // only small label is visible near window bottom edge.
            inView = _inView(ey1, ey2, py1, py2);
         }
         
         return inView;
      }
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      this.getAngularErrorsForName = function(form, name)
      {
         return form[name] && form[name].$error;
      };
      
      this.getValidationContextForName = function(form, name)
      {
         var vc, vcn;
         if ( form && name )
         {
            vc = form.$swValidationContext || {};
            form.$swValidationContext = vc;
            vcn = vc[name] || {};
            vc[name] = vcn;
         }
         else
         {
            // If validation rules are applied to input without form/name then
            // use "dummy" context so that all validation operations are performed
            // in angular but without registering in our extended validation context.
            vcn = {};
         }
         return vcn;
      };
      
      this.setValidationContextForName = function(element, form, modelCtrl, name, tokens)
      {
         var vcn = this.getValidationContextForName(form, name);
         _.each(tokens, function(context, token)
         {
            _processValidationContextForToken(vcn, element, token, context);
            modelCtrl.$setValidity(token, context.valid);
         });
         _monitorInputValidity(element, vcn);
      };
      
      // private
      function _processValidationContextForToken(swValidationContextForName, element, token, context)
      {
         swValidationContextForName[token] = context;
         _validateToken(token, context, element);
         element = element.data('sw-input-wrapper') || element; // see Input.js
         _this.monitorTokenActivity(element, token, context);
      }
      
      this.monitorTokenActivity = function(element, token, context)
      {
         // toggle class when activity of this token is changed
         
         var className = 'sw-validation-' + token;
         
         var prevActive = element.data(className) || false;
         var currActive = _isActive(context);
         
         if ( prevActive !== currActive )
         {
            element.data(className, currActive);
            element.toggleClass(className);
         }
      };
      
      // private
      function _monitorInputValidity(element, tokens)
      {
         // Toggle class when input validity is changed.
         
         // This is a duplication of Angular functionality because
         // we need to set classes on input wrappers (see Input.js _process)
         
         element = element.data('sw-input-wrapper') || element;
         
         var classValid   = 'ng-valid';
         var classInvalid = 'ng-invalid';
            
         var prevValid = element.data(classValid); // first time it is 'undefined'
         var currValid = !_this.isInvalid(tokens);
         
         if ( prevValid !== currValid )
         {
            element.data(classValid, currValid);
            if ( currValid )
            {
               element.addClass(classValid);
               element.removeClass(classInvalid);
            }
            else
            {
               element.removeClass(classValid);
               element.addClass(classInvalid);
            }
         }
      }
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      this.composeMessageForToken = function(swValidationContextForName, token)
      {
         var context = swValidationContextForName[token] || {};
         var res = context.message ? context.message : 'ValidationError.' + token;
         return swI18nService.getResource(res, context);
      };
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      this.isValid = function(tokens)
      {
         return !this.isInvalid(tokens);
      };
      
      this.isInvalid = function(tokens)
      {
         return _.any(tokens, function(context, token)
         {
            _validateToken(token, context);
            return !context.valid;
         });
      };
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      function _isActive(context)
      {
         return !_.has(context, 'active') || !!context.active;
      }
      
      function _validateToken(token, context, element)
      {
         switch ( token )
         {
            case 'required':
               _validateRequired(context, element);
               break;
            case 'maxlength':
               _validateMaxlength(context, element);
               break;
            case 'number':
               _validateNumber(context, element);
               break;
            case 'numberRange':
               _validateNumberRange(context, element);
               break;
            case 'date':
               _validateDate(context, element);
               break;
            case 'time':
               _validateTime(context, element);
               break;
            case 'dateFormat':
               _validateDateFormat(context, element);
               break;
            case 'timeFormat':
               _validateTimeFormat(context, element);
               break;
            case 'dateRange':
               _validateDateRange(context, element);
               break;
            case 'future':
               _validateFuture(context, element);
               break;
            case 'past':
               _validatePast(context, element);
               break;
            case 'allowedChars':
               _validateAllowedChars(context, element);
               break;
            case 'alpha':
               _validateAlpha(context, element);
               break;
            case 'numeric':
               _validateNumeric(context, element);
               break;
            case 'alphanumeric':
               _validateAlphaNumeric(context, element);
               break;
            case 'pattern':
               _validatePattern(context, element);
               break;
         }
          
         if ( !_isActive(context) )
         {
            context.valid = true;
         }
      }
       
      ///////////////////////////////////////////////////////////////////////////////////
      
      function _validateRequired(context)
      {
         context.valid = !swUtil.isEmpty(context.value);
      }
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      function _validateMaxlength(context, element)
      {
         var m = context.maxlength;
         m = _.isNumber(m) && m > 0 ? m : 0;
         
         context.active = m > 0;
         context.valid = !context.value || context.value.length <= m;
         
         // for message interpolation
         context.limit = m;
         context.delta = context.value ? context.value.length - m : '?';
         
         if ( element )
         {
            if ( context.active )
            {
               element.attr('maxlength', m);
            }
            else
            {
               element.removeAttr('maxlength');
            }
         }
      }
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      function _validateNumber(context)
      {
         context.valid = swUtil.isEmpty(context.value) || _.isNumber(context.value);
      }
      
      function _validateNumberRange(context, element)
      {
         context.valid = true;
         
         var val = context.value;
         var min = context.min;
         var max = context.max;
         
         if ( _.isNumber(val) )
         {
            if ( _.isNumber(min) && val < min )
            {
               context.valid = false;
               context.message = context.messageMin || context.message;
            }
            if ( _.isNumber(max) && val > max )
            {
               context.valid = false;
               context.message = context.messageMax || context.message;
            }
         }
         
         numberAttr(element, 'min', min);
         numberAttr(element, 'max', max);
      }
      
      function numberAttr(element, name, value)
      {
         if ( element )
         {
            if ( _.isNumber(value) )
            {
               element.attr(name, value);
            }
            else
            {
               element.removeAttr(name);
            }
         }
      }
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      this.getMinDate = function()
      {
         return '1850-01-01'; // hardcoded in internal date format (ISO-8601)
      };
      
      this.getMaxDate = function()
      {
         return '2200-12-31'; // hardcoded in internal date format (ISO-8601)
      };
      
      function _validateDate(context)
      {
         var v = context.value;
         var f = context.format;
         if ( f )
         {
            context.valid = swUtil.isEmpty(v) || swDateService.isDateFormatValid(v, f);
         }
         else
         {
            context.valid = swUtil.isEmpty(v) || swDateService.isDttmValid(v);
         }
      }
         
      function _validateTime(context)
      {
         var v = context.value;
         var f = context.format;
         if ( f )
         {
            context.valid = swUtil.isEmpty(v) || swDateService.isTimeFormatValid(v, f);
         }
         else
         {
            context.valid = swUtil.isEmpty(v) || swDateService.isTimeValid(v);
         }
      }
         
      function _validateDateFormat(context)
      {
         var v = context.value;
         var f = context.format;
         context.valid = swUtil.isEmpty(v) || swDateService.isDateFormatValid(v, f);
      }
         
      function _validateTimeFormat(context)
      {
         var v = context.value;
         var f = context.format;
         context.valid = swUtil.isEmpty(v) || swDateService.isTimeFormatValid(v, f);
      }
         
      function _validateDateRange(context)
      {
         context.valid = true;
         
         var dttm = context.value;
         if ( !swUtil.isEmpty(dttm) && swDateService.isDttmValid(dttm) )
         {
            var min = context.min;
            var max = context.max;
            var minDate = _this.getMinDate();
            var maxDate = _this.getMaxDate();
            
            if ( !swDateService.isDttmValid(min) || swDateService.isBefore(min, minDate) )
            {
               min = minDate;
            }
            
            if ( !swDateService.isDttmValid(max) || swDateService.isAfter(max, maxDate) )
            {
               max = maxDate;
            }
            
            context.min = min;
            context.max = max;
            
            if ( swDateService.isBefore(dttm, min) )
            {
               context.valid = false;
               context.message = context.messageMin || context.message;
            }

            if ( swDateService.isAfter(dttm, max) )
            {
               context.valid = false;
               context.message = context.messageMax || context.message;
            }
         }
      }
      
      function _validateFuture(context)
      {
         var dttm = context.value;
         context.valid = swUtil.isEmpty(dttm) || !swDateService.isDttmValid(dttm) || swDateService.isFuture(dttm);
      }
      
      function _validatePast(context)
      {
         var dttm = context.value;
         context.valid = swUtil.isEmpty(dttm) || !swDateService.isDttmValid(dttm) || swDateService.isPast(dttm);
      }
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      function _validateAllowedChars(context)
      {
         // This is very simple implementation of the only current RQ
         // concerning allowed characters restrictions.
         // In case if appropriate RQs are changed and become more complex
         // (different variants of allowable characters) algorithm should
         // be re-factored taking into account 'context.allowedChars' value
         // which should specify the variant.
         
         // | ^ ~ \ & not allowed
         context.valid = swUtil.isEmpty(context.value) ||
                         !_.isString(context.value) ||
                         !context.value.match(/[|\^~\\&]+/);
         
      }
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      function _validateAlpha(context)
      {
         __validateAlphaNumeric(context, /^[a-z]*$/i);
      }
      
      function _validateNumeric(context)
      {
         __validateAlphaNumeric(context, /^[0-9]*$/i);
      }
      
      function _validateAlphaNumeric(context)
      {
         __validateAlphaNumeric(context, /^[0-9a-z]*$/i);
      }
      
      function __validateAlphaNumeric(context, regex)
      {
         context.valid = swUtil.isEmpty(context.value) || regex.test(context.value);
      }
      
      ///////////////////////////////////////////////////////////////////////////////////
      
      function _parseRegex(pattern)
      {
         if ( _.isRegExp(pattern) )
         {
            return pattern;
         }
         
         if ( !_.isString(pattern) )
         {
            throw new Error('regex expected:', pattern);
         }
         
         var match = pattern.match(/^\/(.*)\/([gim]*)$/);
         if ( match )
         {
            return new RegExp(match[1], match[2]);
         }
         else
         {
            throw new Error('regex expected:', pattern);
         }
      }
      
      function _validatePattern(context)
      {
         context.valid = true;
         if ( !swUtil.isEmpty(context.value) )
         {
            var regex = _parseRegex(context.pattern);
            context.format = context.format || regex.toString();
            context.valid = regex.test(context.value);
         }
      }
      
   }]);

});
