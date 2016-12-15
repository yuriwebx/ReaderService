/**

 Usage:
 <div sw-render="booleanExpr" sw-render-to="stringExpr"> Rendered if booleanExpr is "truthy" </div>

 Both expressions are being watched.

 When value of "sw-render" attribute is changed to "truthy" then new scope is created and element content
 is processed in this new scope.
 When value of "sw-render" attribute is changed to "falsy" then scope is destroyed and element is cleared.
 It means that element content is removed from DOM and all scope resources are freed.

 If "sw-render-to" is specified then its value is used as a selector of container where this element
 content should be rendered to. In such a case that container visible children is hidden before rendering.
 "Falsy" value of "sw-render-to" is considered as if this attribute is not specified.

 Element is hidden if its content is not rendered or is rendered to another container
 ("sw-render" is "falsy" or "sw-render-to" is "truthy").

 */

define([

   'module',
   'jquery',
   'ngModule',
   'swLoggerFactory'

], function(

   module,
   $,
   ngModule,
   swLoggerFactory

   ){

   'use strict';

   var logger = swLoggerFactory.getLogger(module.id);
   logger.trace('create');

   var dirName = 'swRender';
   var  toName = 'swRenderTo';

   ngModule.directive(dirName, ['$window', '$compile', function($window, $compile)
   {
      logger.trace('register');

      return {
         restrict: 'A',
         priority: 500,
         terminal: true,
         compile: function(element)
         {
            var _html = element.html();
            var _claz = element[0].className;
            element.html(''); // do not process content until it's necessary

            return function(scope, element, attr)
            {
               var _renderExpr   = attr[dirName];
               var _renderToExpr = attr[ toName];
               var _element = element;
               var _elementDestroyed;
               var _scope;
               var _container;
               var _containerVisibleChildren;

               function _render(containerSelector, secondTry)
               {
                  logger.trace(_renderExpr, containerSelector, 'render', secondTry ? '(second try)' : '');

                  if ( containerSelector )
                  {
                     _container = $(containerSelector);
                     if ( _container.length === 0 )
                     {
                        // Specified container not found.
                        // It could be not only due to programmer mistake but also
                        // due to DOM inconsistency at the moment.
                        // For instance, if <sw-render> directive is specified
                        // in popup and points to element in this popup, or points
                        // to element that is going to be added to DOM during current
                        // angular digest etc.
                        // To resolve such issues we schedule one more attempt next tick.
                        if ( secondTry )
                        {
                           logger.warn(_renderExpr, containerSelector, 'not found');
                        }
                        else
                        {
                           logger.trace(_renderExpr, containerSelector, 'not found (will try once more next tick)');
                           $window.setTimeout(function()
                           {
                              _remove();
                              _render(containerSelector, true);
                           });
                        }
                     }
                     _containerVisibleChildren = _container.children(':visible');
                     _element = $('<div/>');
                     _element.addClass(_claz);
                  }
                  else
                  {
                     _container = null;
                     _containerVisibleChildren = null;
                     _element = element;
                  }

                  if ( _container )
                  {
                     _containerVisibleChildren.hide();
                     _element.html(_html);
                     $compile(_element.contents())(_scope);
                     _container.append(_element);
                  }
                  else
                  {
                     _element.html(_html);
                     $compile(_element.contents())(_scope);
                  }
               }

               function _remove()
               {
                  logger.trace(_renderExpr, 'remove');

                  if ( _container )
                  {
                     _element.remove();
                     _element.html('');
                     _containerVisibleChildren.show();
                  }
                  else
                  {
                     _element.html('');
                  }
               }

               scope.$watchGroup([_renderExpr, _renderToExpr], function(a)
               {
                  logger.trace(_renderExpr, '$watch', _elementDestroyed ? 'destroyed' : '');

                  if ( _elementDestroyed )
                  {
                     return;
                  }

                  var render   = a[0];
                  var renderTo = a[1];

                  element.css({display: render && !renderTo ? '' : 'none'});

                  if ( _scope )
                  {
                     logger.trace(_renderExpr, 'scope.$destroy()');
                     _scope.$destroy();
                     _scope = null;
                  }

                  if ( render )
                  {
                     _scope = scope.$new();
                     _scope.$on('$destroy', function()
                     {
                        logger.trace(_renderExpr, 'scope.$on($destroy)');
                        _remove();
                     });
                     _render(renderTo);
                  }
                  else
                  {
                     _remove();
                  }
               });

               element.on('$destroy', function()
               {
                  logger.trace(_renderExpr, 'element.on($destroy)');
                  _elementDestroyed = true;
                  _remove();
               });

            };
         }
      };
   }]);

});