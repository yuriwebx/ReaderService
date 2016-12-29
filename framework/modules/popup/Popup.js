define([

   'module',
   'underscore',
   'jquery',
   'swServiceFactory',
   './PopupLayouter',
   'text!./Popup.html',
   'text!./Button.html',
   'less!./Popup'

   ], function(

   module,
   _,
   $,
   swServiceFactory,
   layouter,
   defaultTemplate,
   buttonTemplate

   ){

   'use strict';

   swServiceFactory.create({
      module: module,
      service: [

         '$rootScope',
         '$compile',
         '$window',
         '$q',
         '$timeout',
         '$interpolate',
         'swUtil',
         'swUserInputBlockerRegistry',
         'swLayoutManager',
         'swFocusManagerService',
         'swHotKeyService',
         'swApplicationScroll',

      function(

         $rootScope,
         $compile,
         $window,
         $q,
         $timeout,
         $interpolate,
         swUtil,
         swUserInputBlockerRegistry,
         swLayoutManager,
         swFocusManagerService,
         swHotKeyService,
         swApplicationScroll

      )
      {

         var logger = this.logger;

         /////////////////////////////////////////////////////////////////

         var popups = [];
//         var bodyOverflowHiddenCounter = 0;

         /////////////////////////////////////////////////////////////////

         swUserInputBlockerRegistry.register('swPopup', this);

         this.isModal = function()
         {
            return _.any(popups, function(popup)
            {
               return popup.modal;
            });
         };

         this.isElementBlocked = function(element)
         {
            var top = _.last(popups);
            return top && !_isMyChild(top, element);
         };

         /////////////////////////////////////////////////////////////////

         var body = $($window.document.body);

         var  headerPlaceholder =  '<header-placeholder/>';
         var  footerPlaceholder =  '<footer-placeholder/>';
         var contentPlaceholder = '<content-placeholder/>';
         var buttonsPlaceholder = '<buttons-placeholder/>';

         var    popupContainerSelector = '.sw-popup-container';
         var backdropContainerSelector = '.sw-popup-backdrop-container';

         var BODY_PUSH_CLASS = 'sw-application-menu-push';

         //////////////////////////////////////////////////////////////////////

         this.show = function(options)
         {
            var showStartTime = swUtil.now();
            var showEndTime;
            var totalEndTime;

            var scope = (options.scope || $rootScope).$new();
            var scope$id = scope.$id;
            logger.debug(scope$id, 'show start', options.toggleId || '');

            ///////////////////////////////////////////////////////////////////

            var exit = false;
            _.findLast(popups, function(popup)
            {
               if ( !popup.modal && !popup.waitingForDestroyConfirmation )
               {
                  if ( options.toggleId && options.toggleId === popup.toggleId )
                  {
                     logger.debug(scope$id, 'toggle', options.toggleId);
                     exit = true;
                  }
                  if ( options.target && _isMyChild(popup, options.target) )
                  {
                     logger.debug(scope$id, 'target', popup.id);
                     return true;
                  }
                  else
                  {
                     popup.hide(undefined);
                  }
               }
            });
            if ( exit )
            {
               return this.emulateHidden();
            }

            ///////////////////////////////////////////////////////////////////

            _.extend(scope, options.extendScope || {});

            var defaultScrollOptions = {
               options: {
                  height: '100%'
               }
            };

            scope.swScrollOptions = $.extend(true, {}, defaultScrollOptions, scope.swScrollOptions || {});

            var buttons = _processButtons(options);
            var actions = buttons.concat(options.actions || []);

            var ready = false;
            var readyDeferred = $q.defer();
            var deferred = $q.defer();
            var popup;
            var popupElement;
            var arrowElement;
            var backdropElement;
            var bodyChildren;

            var restoreFocus = _.noop;

            //////////////////////////////////////////////////////////////////////

            function popupClickHandler(e)
            {
               logger.trace(scope$id, 'click inside');

               if ( $rootScope.$$phase ) // if angular digest is in progress
               {
                  // mutual exclusion of 'popupClickHandler' and 'backdropClickHandler'
                  logger.trace(scope$id, '$rootScope.$$phase');
                  return;
               }

               var target = $(e.target);
               var  toBeHidden = false;
               var canBeHidden = true;
               _.each(actions, function(action)
               {
                  if ( !action.disabled && target.closest('.sw-popup-' + action.name).length > 0 )
                  {
                     scope.$apply(function()
                     {
                        logger.trace(scope$id, action.name, 'before');
                        var _canBeHidden;
                        if ( _.isFunction(options[action.name]) )
                        {
                           _canBeHidden = options[action.name]();
                        }
                        else if ( _.isFunction(action.click) )
                        {
                           _canBeHidden = action.click();
                        }
                        canBeHidden = _.isUndefined(_canBeHidden) || !!_canBeHidden;
                        if ( canBeHidden )
                        {
                           deferred.resolve(action.name);
                        }
                        logger.trace(scope$id, action.name, 'after ', canBeHidden);
                     });
                     toBeHidden = true;
                  }
               });
               if ( !toBeHidden )
               {
                  if ( target.closest('.sw-popup-close').length > 0 )
                  {
                     scope.$apply(function()
                     {
                        logger.trace(scope$id, 'autoclosing area click - before');
                        deferred.resolve();
                        logger.trace(scope$id, 'autoclosing area click - after');
                     });
                     toBeHidden = true;
                  }
               }
               if ( toBeHidden && canBeHidden )
               {
                  // $timeout needed to process callbacks before destroying
                  $timeout(function()
                  {
                     hide();
                  });
               }
            }

            //////////////////////////////////////////////////////////////////////

            function backdropClickHandler(event)
            {
               if ( !ready )
               {
                  logger.trace(scope$id, event.type, '- not ready - skip');
                  return;
               }

               if ( $rootScope.$$phase ) // if angular digest is in progress
               {
                  // mutual exclusion of 'popupClickHandler' and 'backdropClickHandler'
                  logger.trace(scope$id, event.type, 'backdrop - $rootScope.$$phase');
                  return;
               }

               var clickInside = false;
               var popupRemoved = false;
               var backdropEventsAllowed = false;
               var eventPopupElement = $(event.target).closest('.sw-popup');

               _.findLast(popups, function(popup)
               {
                  if ( !popup.waitingForDestroyConfirmation )
                  {
                     if ( popup.backdropEvents )
                     {
                        backdropEventsAllowed = true;
                     }

                     var cid = scope$id + '/' + popup.id;
                     if ( _isMyChild(popup, eventPopupElement) )
                     {
                        logger.trace(cid, event.type, '- backdrop - click inside');
                        clickInside = true;
                        return true;
                     }
                     else
                     {
                        logger.trace(cid, event.type, '- backdrop - click outside');
                        if ( !popup.modal )
                        {
                           logger.trace(cid, event.type, '- backdrop - popup removed');
                           popup.hide(undefined); // it removes "popup" from "popups" next tick
                           popupRemoved = true;
                        }
                     }
                  }
               });

               backdropEventsAllowed = backdropEventsAllowed && $(event.target).closest('.sw-popup-backdrop-events-allowed').length > 0;
               logger.trace(scope$id, event.type, 'backdropEventsAllowed', backdropEventsAllowed);

               if ( (!clickInside || popupRemoved) && !backdropEventsAllowed )
               {
                  event.stopPropagation();
                  event.preventDefault();
               }
            }

            //////////////////////////////////////////////////////////////////////

            // needed to close modeless popup when user performs back/forward/history
            // 'backdropClickHandler' copy-pasted but without scope.$apply()
            scope.$on('swLocationChange', function()
            {
               if ( !options.modal )
               {
                  logger.trace(scope$id, 'swLocationChange - before callback');
                  deferred.resolve();
                  logger.trace(scope$id, 'swLocationChange - after  callback');
                  // $timeout needed to process callbacks before destroying
                  $timeout(function()
                  {
                     hide();
                  });
               }
            });

            //////////////////////////////////////////////////////////////////////

            function hide()
            {
               if ( !scope )
               {
                  logger.trace(scope$id, 'hide: scope already destroyed');
                  return;
               }

               if ( popup.waitingForDestroyConfirmation )
               {
                  logger.trace(scope$id, 'hide: waiting for destroy confirmation');
                  return;
               }

               var promiseHolder = { promise: $q.when(true) };
               scope.$broadcast('swBeforeDestroy', promiseHolder);
               popup.waitingForDestroyConfirmation = true;
               promiseHolder.promise.then(function(destroyConfirmed)
               {
                  logger.debug(scope$id, 'hide: destroy', destroyConfirmed ? 'confirmed' : 'rejected');
                  popup.waitingForDestroyConfirmation = undefined;
                  if ( destroyConfirmed )
                  {
                      if (options.isHashPopup) {
                          _destroy();
                      } else {
                          scope.$destroy();
                      }
                  }
               });
            }

            //////////////////////////////////////////////////////////////////////

            function getContainer(selector)
            {
               var container = body;
               if ( selector )
               {
                  container = $(selector);
                  if ( container.length === 0 )
                  {
                     logger.warn('PopupService: container not found', selector);
                     container = body;
                  }
               }
               return container;
            }

            //////////////////////////////////////////////////////////////////////

            var t = options.template || defaultTemplate;
            t = t.replace( headerPlaceholder, options.header  || '');
            t = t.replace( footerPlaceholder, options.footer  || '');
            t = t.replace(contentPlaceholder, options.content || '');
            t = t.replace(buttonsPlaceholder, _composeButtonsTemplate(buttons));

            popupElement = $(t);
            popupElement.addClass('sw-popup');

            arrowElement = $('<div/>');
            arrowElement.addClass('sw-popup-arrow sw-popup-arrow-up');
            arrowElement.css('display', 'none');

            if ( options.customClass )
            {
               popupElement.addClass(options.customClass);
               arrowElement.addClass(options.customClass.replace(/(\S+)/g, '$1-arrow'));
            }

            //////////////////////////////////////////////////////////////////////

            var backdropVisible = options.modal   ? true :  options.backdropVisible;
            var backdropEvents  = backdropVisible ? false : options.backdropEvents;

            backdropElement = $('<div/>');
            backdropElement.addClass('sw-popup-backdrop');
            backdropElement.toggleClass('sw-popup-backdrop-modal',   !!options.modal);
            backdropElement.toggleClass('sw-popup-backdrop-visible', !!backdropVisible);
            backdropElement.toggleClass('sw-popup-backdrop-events',  !!backdropEvents);

            // Backdrop in "!modal && !visible" mode is needed not to lose clicks if body is less than screen.

            //////////////////////////////////////////////////////////////////////

            var compileStartTime = swUtil.now();
            $compile(popupElement)(scope);
            logger.trace(scope$id, 'compile', swUtil.now() - compileStartTime);

            var focusManager = swFocusManagerService.createInstance({
               root: true,
               traverseEmpty: true,
            }, scope, popupElement);

            function _layout(context)
            {
               if ( options.pushMode && context.viewport.width < 1000 )
               {
                  body.toggleClass(BODY_PUSH_CLASS, true);
                  if (swApplicationScroll.isUseTransform())
                  {
                     popupElement.css('top', swApplicationScroll.getScrollTop());
                  }
               }
               else if ( options.layout &&
                    (context.events.initiating ||
                     context.events.resizing   ||
                     context.events.orienting  ||
                     context.events.scrolling) )
               {
                  var optionsLayout = _.result(options, 'layout');

                  if (!optionsLayout) {
                     return;
                  }

                  var target = _.find(_.map(['of.target', 'of'], _.propertyOf(optionsLayout)));
                  if ( _.isElement(target) && !$window.document.body.contains(target) )
                  {
                     logger.trace(scope$id, 'target detached');
                     return hideResolve(undefined);
                  }

                  var scroll = {
                     top   : swApplicationScroll.getScrollTop(),
                     left  : 0, // TODO?
                     translate   : swApplicationScroll.getScroll().isUseTransform()
                  };

                  optionsLayout = _.extend(_.clone(optionsLayout), {
                     firstFlag   : context.events.initiating,
                     viewport    : context.viewport,
                     scroll      : scroll,
                     popupElement: popupElement,
                     arrowElement: arrowElement
                  });
                  layouter.layout(optionsLayout);
               }
            }

            function _domChange()
            {
                if ( !scope || popup.waitingForDestroyConfirmation )
                {
                    return;
                }

                var domStartTime = swUtil.now();
                logger.trace(scope$id, 'dom  start', swUtil.now() - showEndTime);

                //               if ( options.bodyOverflowHidden !== false )
                //               {
                //                  bodyOverflowHiddenCounter++;
                //                  body.css({overflow: 'hidden'});
                //               }

                var popupContainer, backdropContainer;

                if (options.isHashPopup && popupElement.parent().length > 0) {
                    popupElement.show();
                    arrowElement.show();
                    backdropElement.show();
                } else {
                    popupContainer = getContainer(options.container || popupContainerSelector);
                    popupContainer.append(popupElement);
                    popupContainer.append(arrowElement);

                    backdropContainer = getContainer(options.backdropContainer || backdropContainerSelector);
                    backdropContainer.append(backdropElement);
                }

                _layout(swLayoutManager.context());
                swLayoutManager.register({
                    layout: _layout,
                    id: scope$id
                });

                popupElement.on('click', popupClickHandler);

                // Safari on iOS only allows the mouse events to bubble up if target
                // element, or any of its ancestors up to but not including the <body>,
                // has an explicit event handler set for any of the mouse events.
                // See http://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html
                // So, to catch all clicks in Safari we have to listen to <body> direct children.
                // "Capture" phase is used to keep the possibility to do "stopProparation()"
                // in client code on "Bubble" phase and not to lose events here.
                bodyChildren = body.children();
                _.each(bodyChildren, function(child)
                {
                    child.addEventListener('click', backdropClickHandler, true);
                });

                swHotKeyService.bind(popupElement, {esc: function()
                {
                    logger.trace(scope$id, 'escape');

                    if ( !options.modal )
                    {
                        scope.$apply(function()
                        {
                            hideResolve(undefined);
                        });
                    }
                    else
                    {
                        popupElement.find('.sw-popup-button-escape').click();
                    }
                }});

                $window.setTimeout(function()
                {
                    if ( !scope || popup.waitingForDestroyConfirmation )
                    {
                        return;
                    }

                    if ( options.requestFocus !== false )
                    {
                        restoreFocus = swFocusManagerService.saveFocus(scope$id);
                        swFocusManagerService.requestDefaultFocus(focusManager);
                    }

                    // we are ready next tick after nearest digest
                    scope.$evalAsync(function()
                    {
                        $window.setTimeout(function()
                        {
                            readyDeferred.resolve();
                            ready = true;
                            logger.trace(scope$id, 'ready');
                        });
                    });
                });

                totalEndTime = swUtil.now();
                logger.trace(scope$id, 'dom  end  ', totalEndTime -  domStartTime);
                logger.trace(scope$id, 'total:',     totalEndTime - showStartTime);
            }

            $window.setTimeout(_domChange);


            function _destroy()
            {
                logger.trace(scope$id, 'destroy');
                swLayoutManager.unregister(scope$id);

                _.each(bodyChildren, function (child) {
                    child.removeEventListener('click', backdropClickHandler, true);
                });

                if (options.isHashPopup) {
                    popupElement.hide();
                    arrowElement.hide();
                    backdropElement.hide();
                } else {
                    popupElement.remove();
                    arrowElement.remove();
                    backdropElement.remove();

                    scope = undefined;
                }

                //               if ( options.bodyOverflowHidden !== false && --bodyOverflowHiddenCounter === 0 )
                //               {
                //                  body.css({overflow: ''});
                //               }

                popups = _.without(popups, popup);
                restoreFocus();

                body.removeClass(BODY_PUSH_CLASS);
            }
            scope.$on('$destroy', _destroy);

            var layoutImmediately = function()
            {
               _layout(swLayoutManager.context());
            };

            var layoutDebounced = _.debounce(layoutImmediately, 100);

            function hideResolve(value)
            {
               logger.trace(scope$id, 'hideResolve', value, scope ? '' : '- already destroyed' );
               if ( scope && arguments.length > 0 )
               {
                  deferred.resolve(value);
                  $timeout(function()
                  {
                     hide();
                  });
               }
               else
               {
                  hide();
               }
            }

            popup = {
               id: scope$id,
               modal: options.modal,
               toggleId: options.toggleId,
               readyPromise: readyDeferred.promise,
               promise: deferred.promise,
               layout: layoutDebounced,
               layoutImmediately: layoutImmediately,
               hide: hideResolve,
               element: popupElement,
               arrowElement: arrowElement,
               backdropEvents: backdropEvents,
               isHidden: function()
               {
                  return !scope;
               },
               show: function () {
                   popups.push(this);
                   _domChange();
               }
            };

            popups.push(popup);

            var now = swUtil.now();
            logger.trace(scope$id, 'show end  ', now - showStartTime);
            showEndTime = now;

            return popup;
         };

         //////////////////////////////////////////////////////////////////////

         this.emulateHidden = function()
         {
            return {
               readyPromise: $q.when(),
               promise: $q.when(),
               layout: _.noop,
               hide: _.noop,
               isHidden: function()
               {
                  return true;
               }
            };
         };

         //////////////////////////////////////////////////////////////////////

         var _predefinedButtons = [
            { name: 'yes',    type: 'standard' },
            { name: 'ok',     type: 'standard' },
            { name: 'apply',  type: 'standard' },
            { name: 'submit', type: 'standard' },
            { name: 'open',   type: 'standard' },
            { name: 'no',     type: 'action'   },
            { name: 'cancel', type: 'action'   },
            { name: 'close',  type: 'action'   }
         ];

         var _buttonTemplateInterpolate = $interpolate(buttonTemplate);

         function _processButtons(options)
         {
            var buttons = options.buttons || [];

            _.each(_predefinedButtons, function(button)
            {
               if ( _.isFunction(options[button.name]) )
               {
                  buttons.push({
                     name:  button.name,
                     type:  button.type
                  });
               }
            });

            return buttons;
         }

         function _composeButtonsTemplate(buttons)
         {
            _prepareButtonsHotKeys(buttons);

            return _.map(buttons, function(button)
            {
               return _buttonTemplateInterpolate(_.defaults(button, {
                  label:  'Popup.button.' + button.name + '.label',
                  icon:   'i-' + button.name,
                  escape: button.escape,
                  focus:  button.focus
               }));
            }).join('');
         }

         function _prepareButtonsHotKeys(buttons)
         {
            var escapeButton;
            var  focusButton;

            var actionButtons = _.filter(buttons, function(button)
            {
               return button.type === 'action';
            });
            if ( actionButtons.length === 1 )
            {
               escapeButton = actionButtons[0];
            }

            var standardButtons = _.filter(buttons, function(button)
            {
               return button.type === 'standard';
            });
            if ( standardButtons.length > 0 )
            {
               focusButton = standardButtons[0];
            }
            else if ( buttons.length > 0 )
            {
               focusButton = buttons[0];
            }

            if ( escapeButton )
            {
               escapeButton.escape = 'sw-popup-button-escape';
            }
            if ( focusButton )
            {
               focusButton.focus = 'sw-focus-default';
            }
         }

         //////////////////////////////////////////////////////////////////////

         function _isMyChild(popup, possibleChild)
         {
            var $elem = popup.element;
            return $elem.is(possibleChild) || $elem.has(possibleChild).length > 0;
         }

         //////////////////////////////////////////////////////////////////////

      }]
   });
});
