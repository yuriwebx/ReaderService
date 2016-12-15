define([
      'ngModule',
      'underscore',
      './Layouts',
      'text!./Keyboard.html',
      'less!./Keyboard.less'
   ],
   function (ngModule, _, Layouts, template ) {
      'use strict';

      var DIRECTIVE_NAME = 'swKeyboard';
      var deps = [
         '$window',
         '$document',
         'swKeyboardService',
         'swUnifiedSettingsService',
         '$timeout',
         'swFeatureDetector',
         'swScrollFactory',
         'swApplicationScroll',
         swKeyboardDirective
      ];

      ngModule.directive( DIRECTIVE_NAME, deps);
      function swKeyboardDirective($window, $document, swKeyboardService, swUnifiedSettingsService, $timeout, swFeatureDetector, swScrollFactory, swApplicationScroll)
      {
         return {
            restrict: 'E',
            template: template,
            replace: true,
            link: function( $scope, element )
            {

               if (swFeatureDetector.isDesktop()) {
                  _init();
               }

               function _init() {
                  var _processApi = {
                     process  : process,
                     unprocess: unprocess
                  };
                  swKeyboardService.registry(_processApi);
                  element.on('$destroy', function _onElementDestroy()
                  {
                     swKeyboardService.unregistry(_processApi);
                     swUnifiedSettingsService.removeOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _langListener);
                     $document.off('keydown', pushKeyStart);
                     $document.off('keyup', pushKeyEnd);
                     _cancelKeyboardReposition();
                  });

                  var defaultLanguage  =  swUnifiedSettingsService.getSetting('LibraryFilteringSettings', 'selectedLibraryLanguage');
                  var scrollTop;
                  var CapsLockOn       =  false;
                  var CtrlPress        =  false;
                  var keyboardActive   =  false;
                  var input            =  null;
                  var keyCodes         =  {
                     8  :  setBackspace,         // backspace
                     13 :  keyboardShow,         // enter
                     20 :  setCapsLock,          // capsLock
                     16 :  toggleShift           // shift
                  };
                  var passedValue      =  '';
                  var startPosition;
                  var keyHash          = {};
                  $scope.isShiftOn     = 0;
                  $scope.language      = defaultLanguage;
                  $scope.keyboardClose = keyboardClose;
                  $scope.keyboardShow = true;
                  swKeyboardService.setKeyboardToggle(keyboardShow);

                  $document.on('keydown', pushKeyStart);
                  $document.on('keyup', pushKeyEnd);

                  var scrollTimerId = null;
                  var repositionMaxAttempts = 10; // IIAKOM
                  _scheduleKeyboardReposition();

                  function _scheduleKeyboardReposition() {
                     _cancelKeyboardReposition();
                     scrollTimerId = $timeout(_conductKeyboardReposition, 10); // IIAKOM
                  }

                  function _cancelKeyboardReposition() {
                     if (scrollTimerId) {
                        $timeout.cancel(scrollTimerId);
                        scrollTimerId = null;
                     }
                  }

                  function _conductKeyboardReposition() {
                     var scroll = _getScroll();
                     if (!scroll) {
                        if (repositionMaxAttempts--) {
                           _scheduleKeyboardReposition();
                        }
                        return;
                     }

                     scrollTop = scroll.getScrollTop();
                     element[0].style.top = $window.innerHeight - element[0].offsetHeight + scrollTop + 'px';
                     $scope.keyboardShow = false;
                  }

                  function _langListener(langSetting) {
                     $scope.language = langSetting.value || defaultLanguage;
                     fillKeyHash();
                  }

                  swUnifiedSettingsService.addOnSettingsChangeListener('LibraryFilteringSettings', 'selectedLibraryLanguage', _langListener);
                  function toggleShift() {
                     if(CapsLockOn){
                        $scope.isShiftOn = 0;
                        CapsLockOn = false;
                     }
                     $scope.isShiftOn = 1 - $scope.isShiftOn;
                  }

                  $scope.setShiftOn = function setShiftOn(flag) {
                     $scope.isShiftOn = +Boolean(flag);
                  };

                  function setCapsLock () {
                     if($scope.language === 'ar' || $scope.language === 'fa') {
                        return false;
                     }
                     if(!CapsLockOn){
                        $scope.isShiftOn = 2;
                        CapsLockOn = true;
                     }
                     else {
                        $scope.isShiftOn = 0;
                        CapsLockOn = false;
                     }
                  }

                  function setBackspace() {
                     if (clearSelection(input[0])) {
                        return false;
                     }
                     var value = input.val();

                     var startPosition = doGetCaretPosition(input[0]);
                     if (startPosition === 0){
                        return false;
                     }
                     else {
                        var start = value.slice(0, startPosition - 1);
                        var end = value.slice(startPosition);
                        input.val(start + end);
                        setCaretPosition(input[0], startPosition - 1);
                     }
                     return false;
                  }

                  function _getScroll() {
                     return swScrollFactory.getParentScroll(element[0]|| swApplicationScroll.getScroll());
                  }


                  $scope.keyboardLayouts = new Layouts($scope);
                  function process(_input) {
                     input = _input;
                  }

                  function unprocess() {
                     input = null;
                  }

                  function fillKeyHash() {
                     var lang = $scope.language;
                     if (keyHash.hasOwnProperty(lang)) {
                        return;
                     }

                     keyHash[lang] = {};
                     $scope.keyboardLayouts[lang].forEach(function(row) {
                        row.forEach(function(key) {
                           keyHash[lang][key.code] = key;
                        });
                     });
                  }

                  fillKeyHash(defaultLanguage);

                  $scope.keyboardLayouts[$scope.language].defaultWidth = 35;
                  $scope.getKeyView = function getKeyView(key) {
                     return Array.isArray(key.symbol) ? key.symbol[$scope.isShiftOn] : key.symbol;
                  };

                  $scope.keyPress = function(key, event) {
                     event.preventDefault();
                     for (var keyCode in keyCodes) {
                        if (+keyCode === key.code) {
                           return keyCodes[keyCode]();
                        }
                     }


                     switch (key.code) {
                        case 32: // whitespace
                           passedValue = ' '; break;
                        case 9: //tab
                           passedValue = '   '; break;
                        case 13: //enter
                           passedValue = ''; break;
                        default:
                           passedValue = key.symbol[$scope.isShiftOn];
                     }
                     if(!CapsLockOn){
                        $scope.isShiftOn = 0;
                     }
                     clearSelection(input[0]);
                     startPosition = doGetCaretPosition(input[0]);
                     var value = input.val();
                     var start = value.slice(0,startPosition);
                     var end = value.slice(startPosition);
                     input.val(start + passedValue + end);
                     setCaretPosition(input[0], startPosition + 1);
                     input.trigger('input');
                     // fix for IE
                     input.trigger('change');
                  };


                  function pushKeyStart(event){
                     if (event.ctrlKey) {
                        if(!CtrlPress) {
                           keyboardActive = false;
                           CtrlPress = true;
                        }
                     }
                     var lang = $scope.language;
                     if (!keyHash[lang].hasOwnProperty(event.keyCode)) {
                        return;
                     }
                     var key = keyHash[lang][event.keyCode];

                     if(keyboardActive){
                        $scope.keyPress(key, event);
                     }
                     //$scope.setShiftOn(event.shiftKey);
                     $scope.$evalAsync(function(){
                        key.isActive = true;
                        $timeout(function() {
                           key.isActive = false;
                        },100);
                     });
                  }

                  function pushKeyEnd(event) {
                     if (event.ctrlKey && CtrlPress) {
                        keyboardActive = true;
                        CtrlPress = false;
                     }
                  }

                  function keyboardShow() {
                     if (!keyboardActive) {
                        $scope.keyboardShow = true;
                        keyboardActive = true;
                     }
                     else {
                        $scope.keyboardShow = false;
                        keyboardActive = false;
                     }

                     // fix for IE
                     element.toggleClass('force-redraw');
                     _.delay(function() {
                        element.toggleClass('force-redraw');
                     }, 100);
                  }

                  function keyboardClose() {
                     $scope.keyboardShow = false;
                     keyboardActive = false;
                  }

                  function clearSelection (textInput) {
                     if (textInput.selectionStart === textInput.selectionEnd) {
                        return false;
                     }
                     var startPos = textInput.selectionStart;
                     var start = textInput.value.slice(0, startPos);
                     var end = textInput.value.slice(textInput.selectionEnd);
                     textInput.value = start + end;
                     setCaretPosition(textInput, start);
                     return true;
                  }

                  function doGetCaretPosition (ctrl) {
                     var CaretPos = 0;
                     if ($document.selection) {
                        ctrl.focus ();
                        var Sel = $document.selection.createRange ();
                        Sel.moveStart ('character', -ctrl.value.length);
                        CaretPos = Sel.text.length;
                     }
                     else if (ctrl.selectionStart || ctrl.selectionStart === '0'){
                        CaretPos = ctrl.selectionStart;
                     }
                     return (CaretPos);
                  }

                  function setCaretPosition(ctrl, pos) {
                     ctrl.focus();
                     ctrl.setSelectionRange(pos,pos);
                  }

                  var shiftX;
                  var shiftY;

                  $scope.startMove = function(e) {
                     shiftX = e.pageX - getCoords(element[0]).left;
                     shiftY = e.pageY - getCoords(element[0]).top;
                     $document.on('mousemove', moveAt);

                  };

                  $document.on('mouseup', stopMove);

                  function stopMove() {
                     $document.off('mousemove', moveAt);
                  }


                  $scope.finishMove = function(){
                     $document.off('mousemove', moveAt);
                  };

                  function moveAt(e) {
                     var left = e.pageX - shiftX;
                     var top = e.pageY - shiftY;
                     element[0].style.left = left + 'px';
                     element[0].style.top = top + 'px';
                  }

                  function getCoords(elem) {
                     var box = elem.getBoundingClientRect();

                     return {
                        top: box.top + $window.pageYOffset + scrollTop,
                        left: box.left + $window.pageXOffset
                     };
                  }

                  // fix for IE
                  $scope.stylesForKey = function(key) {
                     var styles = '';
                     styles += 'width: ' + (key.width || $scope.keyboardLayouts[$scope.language].defaultWidth) + 'px;';
                     styles += 'text-indent: ' + (key.textIndent || 0) + 'px;';
                     return styles;
                  };
               }

            }
         };
      }
   });
