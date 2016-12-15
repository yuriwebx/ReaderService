/* jshint browser: true */
/* globals angular */
(function () {
   'use strict';
   function _onLoad() {
      _jumper();

      if (data.mode === 'search') {
         _changeSearchAction();
         if (_needAddSearchButton()) {
            _addSearchLink();
         }
      }
   }

   var data = _parseCurrentInformation(), searchLink;

   var start = function() {
      if(data.jsapiPathPrefix){
         window.jsapiPathPrefix = data.jsapiPathPrefix;
      }
      _addElement('script', {
         type : 'text/javascript',
         src : data.path + '/searcher/build/bowser.js',
         onload : function () {
            if (/* globals bowser, console */
            (bowser.msie && bowser.version < 11) ||
            (bowser.safari && bowser.version < 8) ||
            (bowser.chrome && bowser.version < 45) ||
            (bowser.firefox && bowser.version < 40)
            ) {
               console.log('Too old browser :(');
            }
            else {
               if (data.mode === 'search') {
                  _addElement('script', {
                     type : 'text/javascript',
                     src : data.path + '/searcher/build/{{appSearcherUrl}}',
                     onload : function () {
                        addStyle(
                           "@font-face {font-family: 'Amiri';font-weight: normal;" + "font-style: normal;" +
                           "src: url(\"" + data.path + "/reader/app/style/fonts/Amiri-20160615/Amiri.woff\") format('woff');} " +
                           "@font-face {font-family: 'FontAwesome';font-weight: normal;" + "font-style: normal;" +
                           "src: url(\"" + data.path + "/reader/app/style/fonts/FontAwesome-20160706/fontawesome-webfont.woff\") format('woff');}"
                        );
                        var a = document.getElementsByClassName('mmenucontainer')[0];
                        var div = document.createElement('DIV');
                        if (a) {
                           div.className = 'mmenucontainer-wrapper';
                           a.parentNode.insertBefore(div, a);
                           a.style.top = 'auto';
                           div.appendChild(a);
                        }
                        var b = document.getElementById('menu5');
                        if (b) {
                           div.classNam = 'menu5-wrapper';
                           b.parentNode.insertBefore(div, b);
                           b.style.top = '55px';
                           div.appendChild(b);
                        }
                        if (searchLink) {
                           searchLink.style.color = 'blue';
                           if (searchLink.parentNode) {
                              searchLink.parentNode.removeAttribute('onmouseover');
                           }
                        }
                        window.initIRLS();
                     }
                  });
               }

               if (document.readyState !== 'loading') {
                  _onLoad();
               }
               else {
                  _addEventListener(document, 'DOMContentLoaded', _onLoad);
               }
            }
         }
      });
   };
   var checkStart = function(){
      if(document.body){
         start();
      }
      else {
         window.setTimeout(checkStart, 100);
      }
   };
   checkStart();

   function _addSearchLink() {
      var options = {
         onclick : function () {
            search('');
         },
         href : '#',
         "class" : 'irls-custom-icon'
      };
      var link = _addElement('a', options, document.getElementById('maincontent'));

      var texts = {
         en : 'Search Library',
         ar : 'بحث',
         fa : 'جستجو'
      };

      link.textContent = texts[_getLang()];
   }

   function _needAddSearchButton() {
      return !_getFolderLang();
   }

   function _jumper() {
      if (/^#[a-zA-Z0-9+/]{32,}=*/.test(location.hash)) {
         var inData;
         try {
            inData = JSON.parse(decodeURIComponent(atob(location.hash.substr(1))));
            var paraId = (+inData.paraId - 2) || 0;
            if (document.getElementById('maincontent')) {
               var nodes = document.getElementById('maincontent').childNodes;
               for (var i = 0, curI = -1; i < nodes.length; i++) {
                  if (nodes[i].nodeType === 1 && nodes[i].innerText) {
                     curI++;
                  }
                  if (curI === paraId) {
                     nodes[i].id = 'para_' + paraId;
                     nodes[i].innerHTML = highlightKeyWords(nodes[i].innerHTML, inData.words || []);
                     location.hash = '#para_' + paraId;
                     break;
                  }
               }
            }
         }
         catch (e) {
            console.error(e);
         }
      }
   }

   function _changeSearchAction() {
      var clicker = function (e) {
         e.preventDefault();
         search('');
         return false;
      };

      var a = _findTagsByCond('a', function (a) {
         return a.rel && a.rel === 'irlsSearchLink';
      });
      if(a && a[0]) {
         a = a[0];
         if (a.parentNode) {
            a.parentNode.onmouseover = function (e) { // for IE - make sure no mouseover.
               e.preventDefault();
               e.stopPropagation();
               return false;
            };
            a.parentNode.removeAttribute('onmouseover');
         }
         searchLink = a;
         a.style.color = 'grey';
         a.onclick = clicker;
      }

   }

   function _addEventListener(el, event, callback) {
      if (el.addEventListener) {
         el.addEventListener(event, callback, false);
      }
      else {
         el.attachEvent('on' + event, callback);
      }
   }


   function _isLoaded() {
      return window.initIRLS && angular && angular.element(document).data('$injector');
   }

   function search(text) {
      if (!_isLoaded()) {
         showLoader();
         autoHideLoaderAndSearch();
         return;
      }

      var _attrs = {
         search : text,
         lang : _getLang(),
         clientid : data.clientID || ''
      };
      var _element = _addElement('sw-app-searcher', _attrs);
      _compileElement(_element);
   }

   var hasLoaderBeenShown = false;

   function showLoader() {
      if (!hasLoaderBeenShown) {
         hasLoaderBeenShown = true;
         addStyle(
            '#srchldrdarkbox {position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: rgba(0, 0, 0, .5);z-index: 1000;}' +
            '#srchldrmessage-popup {position: absolute;width: 400px;min-height: 200px;background: #fff;top: 50%;left: 50%;' +
            'margin: -100px 0 0 -200px;z-index: 1001;border-radius: 5px;box-shadow: inset 0 0 0 1px #fff, inset 0 0 0 2px #c93615;text-align: center}' +
            '#srchldrmessage-popup .message-popup-wrap {padding: 20px;position: relative;}' +
            '#srchldrmessage-popup .bttn-close-popup {position: absolute;font-size: 24px;width: 30px;height: 30px;' +
            'transform: rotate(45deg);top: 10px;right: 10px;text-align: center;line-height: 30px;}' +
            '#srchldrmessage-popup .bttn-close-popup a {display: block;text-decoration: none;color: #7a7767;}' +
            '#srchldrmessage-popup .bttn-close-popup a:hover {font-size: 30px;}' +
            '#srchldrmessage-popup h2{margin-right: 20px;overflow: hidden;}' +
            '#srchldrmessage-popup .pic-block {width: 30px;height: 30px;margin: 20px auto 0;background: url(' + data.path +
            '/searcher/app/style/images/wpspin_light.gif) no-repeat;background-size: 100%;}'
         );



         var darkbox = document.createElement('div');
         darkbox.id = 'srchldrdarkbox';
         document.body.appendChild(darkbox);
         var popup = document.createElement('div');
         popup.id = 'srchldrmessage-popup';
         popup.innerHTML = '<div class="message-popup-wrap"><div class="bttn-close-popup"><a href="#" onclick="' +
         'document.getElementById(\'srchldrdarkbox\').style.display=\'none\';' +
         'document.getElementById(\'srchldrmessage-popup\').style.display=\'none\'; return false;">+</a></div>' +
         '<h2>Please wait</h2>' +
         '<div class="message-block"><div class="text-block">' +
         '<p>Loading the search engine.</p></div>' +
         '<div class="pic-block"></div></div></div>';
         document.body.appendChild(popup);
      }
      else {
         document.getElementById('srchldrdarkbox').style.display = 'block';
         document.getElementById('srchldrmessage-popup').style.display = 'block';
      }
   }

   function hideLoader(remove) {
      var el = document.getElementById('srchldrdarkbox');
      if (el) {
         el.style.display = 'none';
         document.getElementById('srchldrmessage-popup').style.display = 'none';
         if (remove) {
            el.parentNode.removeChild(el);
            el = document.getElementById('srchldrmessage-popup');
            el.parentNode.removeChild(el);
         }
      }
   }

   function autoHideLoaderAndSearch() {
      var inter;
      inter = setInterval(checker, 300);
      function checker() {
         if (_isLoaded()) {
            clearInterval(inter);
            var needSearch = document.getElementById('srchldrdarkbox') && document.getElementById('srchldrdarkbox').style.display !== 'none';
            hideLoader(true);
            if (needSearch) {
               search('');
            }
         }
      }
   }

   function _compileElement(_element) {
      var injector = angular.element(document).data('$injector');

      injector.invoke(['$rootScope', '$compile', function ($rootScope, $compile) {
         $rootScope.$apply(function () {
            var scope = $rootScope.$new();
            $compile(_element)(scope);
         });
      }]);
   }

   function _addElement(tag, attrs, beforeElement) {
      var _element = document.createElement(tag);
      _it(attrs || {}, function (value, key) {
         if (typeof value === 'function') {
            _element[key] = value;
         }
         else {
            _element.setAttribute(key, value);
         }
      });

      if (beforeElement) {
         document.body.insertBefore(_element, beforeElement);
      }
      else {
         document.body.appendChild(_element);
      }
      return _element;
   }

   function _it(obj, callback) {
      var key;
      if (obj.length) {
         for (key = 0; key < obj.length; key++) {
            callback(obj[key], key, obj);
         }
      }
      else {
         for (key in obj) {
            if (_has(obj, key)) {
               callback(obj[key], key, obj);
            }
         }
      }
   }

   function _map(obj, callback) {
      var results = [];
      for (var key in obj) {
         if (_has(obj, key)) {
            results.push(callback(obj[key], key, obj));
         }
      }
      return results;
   }

   function _reduce(list, it, memo) {
      _it(list, function (val) {
         memo = it(memo, val);
      });
      return memo;
   }

   function _filter(list, predicate) {
      var res = [];
      _it(list, function (val) {
         if (predicate(val)) {
            res.push(val);
         }
      });
      return res;
   }

   function _has(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
   }

   function _curry(fn) {
      var args = getRest(toArray(arguments));

      return function () {
         return fn.apply(this, args.concat(toArray(arguments)));
      };
   }

   function getRest(arrOrString) {
      return toArray(arrOrString).slice(1);
   }

   function toArray(arr) {
      var res = [];
      _it(arr, function (val) {
         res.push(val);
      });
      return res;
   }

   var _langs = {
      en : 'en',
      ar : 'ar',
      fa : 'fa',
      Farsi : 'fa'
   };

   function _getFolderLang() {
      var pathname = window.location.pathname;
      var arr = pathname.split('/');
      var filteredArray = _filter(arr, _curry(_has, _langs));

      return filteredArray[0];
   }

   function _getLang() {
      var pathname = window.location.pathname;
      var lang;
      var pathLang = pathname.match(/_(ar|fa|en)\.html?$/);
      lang = _getFolderLang() || (pathLang ? pathLang[1] : _langs[0]);
      return _langs[lang] || 'en';
   }

   function _findTagsByCond(tagName, cond) {
      var tags = document.getElementsByTagName(tagName);
      return _filter(toArray(tags), cond);
   }

   function _isCurrentScript(script) {
      return script.src && script.src.match(/\/jsapi/);
   }

   function _parseCurrentInformation() {
      var script = _findTagsByCond('script', _isCurrentScript)[0];
      if (!script) {
         throw new Error('Could not found ');
      }

      var src = script.src;

      var idx = src.indexOf('?');

      var res = idx > 0 ? _decodeQuery(src.substr(idx + 1)) : {};

      var path = src.slice(0, idx);

      res.path = path.substr(0, path.lastIndexOf('/'));

      return res;
   }

   function _decodeQuery(query) {
      return _reduce(query.split('&'), function (res, str) {
         var pair = str.split('=');
         if (typeof res[pair[0]] === 'undefined') {
            res[pair[0]] = decodeURIComponent(pair[1]);
         }
         else if (typeof res[pair[0]] === 'string') {
            var arr = [res[pair[0]], decodeURIComponent(pair[1])];
            res[pair[0]] = arr;
         }
         else {
            res[pair[0]].push(decodeURIComponent(pair[1]));
         }
         return res;
      }, {});
   }

   function highlightKeyWords(sentence, wordForms) {
      function getWordFormsRegexp(wordForms) {
         var boundaryCharacter = '[\'\\s\u2011-\u206F.,:;!?"(){}[\\]\\\\/|<>@#$%^&*=]';
         var nonBoundaryCharacter = boundaryCharacter[0] + '^' + boundaryCharacter.slice(1);
         var wordFormsAlternation = '',
            searchWordFroms = '';
         if (wordForms.length !== 0) {
            wordFormsAlternation = _map(wordForms, function (wordForm) {
               return (wordForm || '').replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
            }).join('|');
            searchWordFroms += wordFormsAlternation;
         }

         return new RegExp(
            '(?:^|' + nonBoundaryCharacter + '-|' + boundaryCharacter + ')' +
            '(' + searchWordFroms + ')' +
            '(?=$|-' + nonBoundaryCharacter + '|' + boundaryCharacter + ')', 'igm');
      }

      function highlightFunction(token) {
         return '<strong class="irlsHighlightTerm">' + token + '</strong>';
      }

      return sentence.replace(getWordFormsRegexp(wordForms), function (match, p1) {
         return match === p1 ? highlightFunction(p1) : match.substr(0, match.length - p1.length) + highlightFunction(p1);
      });
   }

   function addStyle(cssText) {
      var style = document.createElement('style');
      style.type = 'text/css';
      if (style.styleSheet) {
         style.styleSheet.cssText = cssText;
      }
      else {
         style.appendChild(document.createTextNode(cssText));
      }
      document.getElementsByTagName('head')[0].appendChild(style);
   }
})();
