/*global window: false */
/*global requirejs: false */

(function(){

'use strict';

requirejs.config({
   waitSeconds : 0,
   baseUrl     : '.',
   less        : {ieCompat: false},
   shim        : {
      'jquery'             : {exports : '$'},
      'underscore'         : {exports : '_'},
      'angular'            : {exports : 'angular',
                              deps: ['jquery'] },
      'angularSanitize'    : {deps: ['angular']},
      'angular-img-cropper': {deps: ['angular']},
      'select2'            : {deps: ['jquery']},
      'underscore.string'  : {deps: ['underscore']},
      'moment'             : {exports : 'moment'},
      'xregexp'            : {exports : 'XRegExp'},
      'unidecode'          : {exports : 'unidecode'},
      'baron'              : {exports : 'baron',
                              deps: ['jquery'] },
      'imageCrop'          : {exports : 'imageCrop',
                              deps: ['angular']},
      'crypto'             : {exports : 'CryptoJS'}
   },
   paths       : {
      'jquery'            : 'framework/lib/jquery-2.1.1',
      'underscore'        : 'framework/lib/lodash-3.9.3/lodash',
	  'PouchAdapterSQLite': 'framework/lib/pouchdb.cordova-sqlite',
      'PouchDB'           : 'framework/lib/pouch/pouchdb-6.0.7.min',
      'angular'           : 'framework/lib/angular-1.4.0/angular',
      'angularSanitize'   : 'framework/lib/angular-1.4.0/angular-sanitize',
      'select2'           : 'framework/lib/select2-3.4.5/select2',// see folder client/pl/component/commons/input
      'moment'            : 'framework/lib/moment-2.8.3/moment',// see folder client/infl/commons/core
      'xregexp'           : 'framework/lib/xregexp/xregexp-all',
      'unidecode'         : 'framework/lib/unidecode/unidecode',
      'fastclick'         : 'framework/lib/fastclick-1.0.6-20150129/lib/fastclick', // see pl/component/commons/fastclick/FastClickConfig.js
      // hacked! https://github.com/ftlabs/fastclick/pull/354 included
      'maskedinput'       : 'framework/lib/digitalbush-masked-input-1.4/jquery.maskedinput',
       // hacked! see ogol comments in source
      'purl'              : 'framework/lib/purl-20140618/purl',//see client/infl/commons/core/appurl/AppUrl.js,
      'hammer'            : 'framework/lib/hammer.js-2.0.2-20140728/hammer',
      'fontloader'        : 'framework/lib/font-loader-1.2.0/fontloader',
      'dotdotdot'         : 'app/lib/dotdotdot/jquery.dotdotdot',
      'baron'             : 'framework/lib/baron',
      'angular-img-cropper': 'framework/lib/angular-img-cropper/src/angular-img-cropper',

      /*
       * workaround: removes explicit reference to PDFJS viewer from the client code. Please, @see BuiltInDocumentViewer.js
       *
       * Be careful when you update the PDF.JS viewer library - changes were made in source code in accordance with requirements.
       * Class 'hidden' was added to the class attribute of the unnecessary control's HTML tags (within viewer.html).
       * Please use viewer.orig.html for comparison.
       */
      'swBuiltInDocumentViewer': 'framework/lib/pdfjs-1.0.277/web/swBuiltInDocumentViewer',
      'swInitialUserSession'   : 'empty:',
      'publication'            : 'app/modules/publication',
      'utils'                  : 'app/modules/utils',
      'appCacheNanny'          : 'framework/lib/appcache-nanny',
      'lith'                   : 'framework/lib/lith',
      'nota'                   : 'framework/lib/nota',
      'underscore.string'      : 'framework/lib/underscore/string.underscore',//see bl/service/Platform.js, bl/service/Search/SearchResultFilter.js
      'platformjs'             : 'framework/lib/platformjs/platform',//see bl/service/Platform.js
      'q'                      : 'framework/lib/q-0.9/q',
      'crypto'                 : 'framework/lib/crypto-md5/md5',
      'config'                 : 'config'
   },
   map : {
      '*' : {
         'domReady'            : 'framework/lib/require-plugins/requirejs-domReady-9973a3e-2.0.1/domReady',
         'text'                : 'framework/lib/require-plugins/text-2.0.10/text',
         'less'                : 'framework/lib/require-plugins/require-less-20131113/less',
         'css'                 : 'framework/lib/require-plugins/require-css-20131113/css',

         'swAppUrl'            : 'framework/modules/appurl/AppUrl',
         'swTextUtils'         : 'framework/modules/util/TextUtils',
//       'swAppUrlConfig'      : 'framework/modules/core/appurl/AppUrlConfigDefault', // see comments in file
         'swAppUrlConfig'      : 'app/modules/config/AppUrlConfig',

         'swDictionaryFactory' : 'app/domain/modules/model/DictionaryFactory',
         'swLoggerFactory'     : 'framework/modules/tracing/LoggerFactory',
         'swMessageBuffer'     : 'framework/modules/message/MessageBuffer',
         'swExceptionHandler'  : 'framework/modules/exception/ExceptionHandler',
         'swServiceFactory'    : 'framework/modules/servicefactory/ServiceFactory',
         'swComponentFactory'  : 'framework/modules/componentfactory/ComponentFactory',
         'swEntityFactory'     : 'framework/modules/entityfactory/EntityFactory',

         'Config'                : 'app/domain/service/Config',
         'ClipboardTracker'      : 'app/domain/service/ClipboardTracker',

         'Context'               : 'app/domain/modules/context/Context',
         'SearchUtils'           : 'shared/searchUtils',
         'ApplicationContext'    : 'app/domain/modules/context/ApplicationContext',
         'ClientNodeContext'     : 'app/domain/modules/context/ClientNodeContext',
         'ExecutionContext'      : 'app/domain/modules/context/ExecutionContext',

         'URIjs'               : 'framework/lib/URI.js-gh-pages/URI',
         'IPv6'                : 'framework/lib/URI.js-gh-pages/IpV6',
         'punycode'            : 'framework/lib/URI.js-gh-pages/punycode',
         'SecondLevelDomains'  : 'framework/lib/URI.js-gh-pages/SecondLevelDomains',

         'HashGenerator'       : 'framework/modules/util/HashGenerator'
      }
   }
});

// uncomment to get a possibility for debug logging in 3rd-party code
// requirejs(['swLoggerFactory'], function(swLoggerFactory)
// {
//    window.swGlobalLogger = swLoggerFactory.getLogger('GLOBAL');
// });

define('ngModule', [

   'swLoggerFactory',
   'swExceptionHandler', // should be 'require'd as early as possible, see ExceptionHandler.js
   'angular',
   'angularSanitize',
   'angular-img-cropper'

], function(

   swLoggerFactory,
   swExceptionHandler,
   ng

){

   var logger = swLoggerFactory.getLogger('ngModule');
   logger.trace('create');

   var ngModule = ng.module('ngModule', ['ngSanitize', 'angular-img-cropper']);

   // override angular $exceptionHandler
   ngModule.value('$exceptionHandler',
         swExceptionHandler.getExceptionHandler());

   // override angular $log
   ngModule.value('$log',
         swLoggerFactory.getLogger('$log'));

   ngModule.config([
         '$compileProvider',
         function ($compileProvider) {
//      var aHrefSanitizationWhitelist = /^\s*(https?|ftp|mailto|tel|file):/,
//          imgSrcSanitizationWhitelist = /^\s*(https?|ftp|file):|data:image\//;

            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|itms-services|file|filesystem):/);
            $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|itms-services|file|filesystem|blob):|data:image\//);
         }
      ]);


  ngModule.config(['$sceDelegateProvider', function ($sceDelegateProvider) {
        $sceDelegateProvider.resourceUrlWhitelist([
            'self',
            'file:**',
            'blob:**',
            /(?:filesystem:)?https?:.*/
         ]);
      }]);

   return ngModule;

});

requirejs([

   'domReady!',
   'ngModule',
   'angular',
   'swLoggerFactory',
   'swAppUrl',
   'Config',
   'appCacheNanny',
   'ClipboardTracker',
   './framework/module',
   './app/module',
   './app-searcher/module'

], function(
   document,
   ngModule,
   ng,
   swLoggerFactory,
   swAppUrl,
   Config,
   appCacheNanny,
   ClipboardTracker

){

   var logger = swLoggerFactory.getLogger('bootstrap');
   logger.trace('starting');

   logger.info('userAgent:', window.navigator.userAgent);
   logger.info('referrer:',  document.referrer);
   logger.info('url:',       swAppUrl.source);

   logger.info('reading configuration...');

   var app = 'searcher';
   app = app.toLowerCase();
   if(app === 'admin'){
      ClipboardTracker.isDataChanged();
   }

   if(window.location.hostname !== "localhost" && !window.cordova){
      // start to check for updates every 30s
      appCacheNanny.start();
   }

   Config.init('searcher', function() {
      ng.bootstrap(document, [ngModule.name]);
   });

   logger.trace('ended');

});

})();
