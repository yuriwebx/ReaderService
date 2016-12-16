/*jslint node: true */
/*jshint unused: vars*/
'use strict';

var express = require('express');
var fs = require('fs');
var plist = require('simple-plist');
var handlebars = require('handlebars');
var app = express();
var bodyParser = require('body-parser');
var publication = require('./rest/publication.js');
var cacheResponseDirective = require('express-cache-response-directive');

var Provider = require(__dirname + '/search/flattables_provider.js');
var search = require(__dirname + '/search/search.js');
var appConfig = require(__dirname + '/utils/configReader.js');
var loggerModule = require(__dirname + '/utils/logger.js');
//var utils = require(__dirname + '/utils/utils.js');
var logger = loggerModule.getLogger(__filename);
var MobileDetect = require('mobile-detect');
var useragent = require('express-useragent');
var validateRest = require(__dirname + '/utils/validateRest.js');
var pathModule = require('path');

loggerModule.setIP('127.0.0.1');
logger.info('Server started in [' + (appConfig.isDev ? 'dev' : 'production') + '] mode');

app.configure(function() {
   app.use(loggerModule.connectLogger);
});

var allowCrossDomain = function (req, res, next) {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Methods', 'POST,GET,PUT,DELETE');
   res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
   next();
};

app.use(allowCrossDomain);
app.use(useragent.express());


app.use(function (req, res, next) {
   loggerModule.setIP(req.headers["X-Forwarded-For"] || req.headers["x-forwarded-for"] || req.client.remoteAddress);
   if(req.query && req.query.RunId){
      req.headers['x-run-id'] = req.query.RunId;
      delete req.query.RunId;
   }
   next();
});



app.use('/rest/manageTests/uploadAttachment', function (req, res, next) {
   req.rawData = new Buffer(0);

   req.on('data', function(chunk) {
      req.rawData = Buffer.concat([req.rawData, chunk]);
   }).on('end', function(){
      next();
   });
});

app.use(cacheResponseDirective());

app.use(bodyParser.urlencoded({
   extended : false
}));
app.use(bodyParser.json({limit: '50000kb'}));

app.use(app.router);
app.use('/shared', express.static(__dirname + '/../shared'));
app.use('/lib', express.static(__dirname + '/../framework/lib'));
app.use('/search/images', express.static(__dirname + '/search/images'));
app.use('/searcher', express.static(__dirname + '/../'));


app.get('/:application/config/customConfigParameters', function (req, res) {
   res.json(appConfig.clientConfig);
});

var isAllowedConfig = (function () {
   var confs = 'client|local.client|deployment|mode.default|agent|default'.split('|').map(function (el) {
      return el + '.config.json';
   });
   return function (conf) {
      return confs.indexOf(conf) !== -1 || /^(custom\.)?language\./.test(conf);
   };
})();


app.get('/:application/config/:conf', function (req, res, next) {
   if (!isAllowedConfig(req.params.conf)) {
      res.send(403);
   }
   else {
      next();
   }

});

app.get('/:application/manifest.appcache', function (req, res) {
   var source = '';
   if (!appConfig.isDev) {
      var currentURL = appConfig.serverURL + req.params.application;
      if (appConfig.isPublic) {
         var serverURL = appConfig.serverURL;
         var host = serverURL.split( '/' )[2];
         source = fs.readFileSync(__dirname + '/../build/manifest.appcache.live').toString();
         source = source.replace(/publicURL/g, serverURL + req.params.application);
         currentURL = appConfig.serverURL.replace(host, appConfig.CDNHostName) + req.params.application;
      }
      else {
         source = fs.readFileSync(__dirname + '/../build/manifest.appcache').toString();
      }
      source = source.replace(/currentURL/g, currentURL);
   }
   res.send(source);
});


app.get('/oauth.html', function(req, res){
   res.set('Content-Type', 'text/html');
   fs.readFile(__dirname + '/../oauth.html', function(err, data){
      if(err){
         fs.readFile(__dirname + '/../oauth.html', function(err, data){
            res.send(data);
         });
      }
      else {
         res.send(data);
      }
   });
});



var libraryStructure;
try {
   libraryStructure = fs.readFileSync(appConfig.libraryDir + 'dirstructure.json');
   if (!libraryStructure) {
      throw (new Error('Library is not accessable'));
   }
} catch (e) {
   logger.error(e);
   setTimeout(process.exit, 100);
}
////
app.get(/^\/files\/(.*)$/, function (req, res) {
   var request = req.params[0];
   var filename = appConfig.libraryDir + (request ? request : '404').replace(/\.\./ig, '');
   fs.exists(filename, function (exists) {
      if (exists) {
         cachingLayer(req, res);
         res.sendfile(filename);
      }
      else if (request) { //send other files
         var parts = request.split('/');
         if (parts) {
            var id = parts[0];
            if ('thumbs' === id) {
               id = parts[parts.length - 1].replace('.png', '');
            }
            publication.get(id).then(function (publ) { // 0_0 :( ^_^
               if (publ.type === 'StudyGuide') {
                  request = request.replace(id, publ.bookId);
                  if (request.indexOf('covers/') !== -1) {
                     request = request.replace(id, 'StudyGuide' + publ.bookId);
                  }
                  filename = appConfig.libraryDir + (request ? request : '404').replace(/\.\./ig, '');
               }
               fs.exists(filename, function (exists) {
                  if (exists) {
                     res.sendfile(filename);
                  }
                  else {
                     res.send(404, 'No such file');
                  }
               });
            }).fail(function(reason){
               res.send(404, 'Not found');
            });
         }
      }
   });

});

app.get('/dump/:dbname', function(req, res) {
    var dbName = req.params.dbname;
    var filename = pathModule.resolve(__dirname, '../', appConfig.agent.dumpPath, dbName); //jshint ignore:line
    fs.exists(filename, function (exists) {
        if (exists) {
            cachingLayer(req, res);
            res.sendfile(filename);
        }
        else {
            res.send(404, 'Not found');
        }
    });
});

app.get('/info', function (req, res) {
   res.set('Content-Type', 'text/javascript');
   res.send(libraryStructure);
});

var isActualVersionOfBrowser = function(req){
    var browserConfigData = JSON.parse(fs.readFileSync(__dirname + '/../config/browser.config.json'));
    var useragent = getUseragentData(req);
    var isSupported = false;
    for (var i in browserConfigData) {
        if (browserConfigData.hasOwnProperty(i) === useragent.hasOwnProperty(i) && useragent[i] >= browserConfigData[i]) {
            isSupported = true;
            break;
        }
    }
    return isSupported;
};

function getUseragentData(req){
    var useragent = {};
    var source = req.useragent.source;
    useragent[req.useragent.browser] = req.useragent.version;
    useragent.gecko = getFirstMatch(source, /gecko\/(\d+(\.\d+)?)/i);
    useragent.trident = getFirstMatch(source, /trident\/(\d+(\.\d+)?)/i);
    useragent.mozilla = getFirstMatch(source, /mozilla\/(\d+(\.\d+)?)/i);
    useragent.webkit = getFirstMatch(source, /webkit\/(\d+(\.\d+)?)/i);

    return useragent;
}

function getFirstMatch(useragent, regex) {
    var match = useragent.match(regex);
    return (match && match.length > 1 && match[1]) || '';
}


//HANDLEBARS COMPILING FOR APPLICATIONS
app.get('/:application/index.html', function (req, res) {
  if(isActualVersionOfBrowser(req)) {
       var source = fs.readFileSync(__dirname + '/../index.html');
       source = source.toString();

       if (Object.prototype.hasOwnProperty.call(req.query, 'rtl')) {
           source = source.replace('<html ', '<html dir="rtl" ');
       }

       var template = handlebars.compile(source);
       var application = req.params.application;
       var isEditor = false;
       if (application === "editor") {
           application = "reader";
           isEditor = true;
       }

       var dropcap = '';
       if(!req.useragent.isWindows) {
          dropcap = "dropcap-shifting";
       }

       var data = {
           dropcap: dropcap,
           appName: application,
           isEditor: isEditor,
           mainPath: "main",
           WEB: true
       };
       res.contentType('text/html');
       res.send(template(data));
   }
   else {
       logger.trace('Unsupported browser ' + req.useragent.browser + ': ' + req.useragent.version);
       res.set('Content-Type', 'text/html');
       fs.readFile(__dirname + '/../unsupported.html', function(err, data){
           if(err){
               logger.error(err);
           }
           else{
               data = data.toString();
               res.contentType('text/html');
               res.send(data);
           }
       });
   }
});

app.get('/:application/main.js', function (req, res) {
   var source = fs.readFileSync(__dirname + '/../main.js');
   var template = handlebars.compile(source.toString());
   var app = req.params.application;
   if (app === 'editor') {
      app = "reader";
   }
   var data = {
      appName     : "app-" + app,
      application : app.charAt(0).toUpperCase() + app.slice(1).toLowerCase()
   };
   res.contentType('text/javascript');
   res.send(template(data));
});

app.get('/manifest-:url.plist', function (req, res) {
   var currentUrl = req.params.url;
   currentUrl = currentUrl.replace('_-', '://');
   currentUrl = currentUrl.replace(/-+/g, '/');
   currentUrl = currentUrl.replace(/(__)+/g, '-');

   var ipaUrl = currentUrl + '/artifacts/' + appConfig.branch + appConfig.brand + '_Reader-' + appConfig.appTarget + '.ipa';
   var data = plist.readFileSync(__dirname + '/manifest.plist');
   data = plist.stringify(data);
   data = data.replace('ipaUrl', ipaUrl);

//configure plist file for different ios versions
   var md = new MobileDetect(req.headers['user-agent']);
   var iosBundleIdentifier = '';
   if(md.version('iOS') < 9.0) {
       iosBundleIdentifier = 'com.isd.irls-reader.' + appConfig.buildnumber;
   }
   else {
       iosBundleIdentifier = 'com.isd.' + appConfig.appTarget;
   }

   data = data.replace('iosBundleIdentifier', iosBundleIdentifier);
   res.contentType('application/octet-stream');
   res.send(data);
});

/**
 * Read facets.json from library dir and make flattable providers for every facet we want to search in.
 * the "default" facet is a place for default library
 */
(function () {
   var facetsInfo = {};
   var facet;
   try {
      var fcontents = JSON.parse(fs.readFileSync(appConfig.libraryDir + 'facets.json').toString()) || {};
      if (fcontents && 'object' === typeof fcontents) {
         for (facet in fcontents) {
            if (fcontents.hasOwnProperty(facet) && 'string' === typeof fcontents[facet] && fcontents[facet].length) {
               facetsInfo[facet] = appConfig.libraryDir + fcontents[facet];
            }
         }
      }
   }
   catch (e) {
      logger.log('No "facets.json" file found');
   }
   facetsInfo.default = appConfig.libraryDir;
   var providers = {};
   for (facet in facetsInfo) {
      if (facetsInfo.hasOwnProperty(facet)) {
         logger.log('Facet "' + facet + '" search provider added');
         providers[facet] = new Provider(facetsInfo[facet]);
      }
   }
   search = search(providers);
})();

app.get('/jsapi', function(req, res){
   if(req.query.mode === 'search'){
      res.set('Content-Type', 'text/javascript');
      res.sendfile(__dirname.replace(/server$/,'') + 'build/explorer.js');
   }
   else {
      res.send(501);
   }
});

app.all('/search', function (req, res) {
   var emptyResult = {rows:[],stems:[]};
   var runId = req.headers['x-run-id'] || '';
   var params = {};
   Object.keys(req.query).forEach(function (key) {
      params[key] = req.query[key];
   });
   Object.keys(req.body).forEach(function (key) {
      params[key] = req.body[key];
   });

   var query = params.q || '';
   var searchFunc = 'search';
   if(req.param('html')){
      res.set('Content-Type', 'text/html');
      searchFunc = 'render';
   }
   else {
      res.set('Content-Type', 'text/javascript');
      if (query.match(/^\s*$/)) {
         res.send(emptyResult);
         return;
      }
   }
   search[searchFunc](query, params, runId).then(function (data) {
      res.send(data);
   }, function (err) {
      logger.error(err);
      res.send(emptyResult);
   });
});

app.get('/search/moretext', function(req, res){
  var emptyResult = {
    text: ''
  };
  var start = parseInt(req.query.start, 10);
  var len = parseInt(req.query.len, 10);
  var clientID = req.query.clientID;

  search.getMoreText(start, len, clientID)
    .then(function(result) {
      res.send(result);
    }, function() {
      res.send(emptyResult);
    });
});


var controllers = {};
app.all('/rest/*', function (req, res) {
   res.setHeader('Expires', 0);
   res.setHeader('Pragma', 'no-cache');
   res.cacheControl({"no-cache": true, "no-store": true, "must-revalidate": true});
   validateRest.validateInput(req).then(function(){

      var path = req.path.replace('/rest/', '').split('/');
      try {
         var newEnd = res.end, controller, action, method = req.method.toUpperCase();
         res.end = function (body) {
            var args = arguments;
            var dt = false;
            if ( !(body instanceof Buffer) ) {
              dt = (body ||'').replace(/[\n\r]+\s*(\S)/gm,'$1');
            }
            if(dt){
               logger.log('RESPONSE "' + req.path + '" Data are: "' + dt + '"');
            }
            validateRest.validateOutput(req, body).then(function(){
               newEnd.apply(res, Array.prototype.slice.call(args));
            }, function(){
               newEnd.apply(res, Array.prototype.slice.call(args));
            });

         };
         if (path[0].length === 0) {
            throw new Error('Wrong controller');
         }
         else {
            var jsonifiedBody = JSON.stringify(req.body);
            if(method === 'POST' && jsonifiedBody !== ''){
               logger.log('POST "' + req.path + '" Data are: "' + jsonifiedBody + '"');
            }
            controller = path.shift();
            if (!controllers.hasOwnProperty(controller)) {
               controllers[controller] = require('./rest/' + controller + 'Controller.js');
            }
            if (controllers[controller] && controllers[controller][method]) {
               if (path.length && (typeof controllers[controller][method] === 'object')) {
                  action = path.shift();
                  if (controllers[controller][method].hasOwnProperty(action)) {
                     controllers[controller][method][action](req, res);
                  }
                  else {
                     throw new Error('No such action at this controller');
                  }
               }
               else {
                  if (typeof controllers[controller][method] === 'function') {
                     controllers[controller][method](req, res);
                  }
                  else {
                     throw new Error('No such method at this controller');
                  }
               }
            }
            else if(controllers[controller] && method === 'OPTIONS'){
               res.send(200,'GET,POST,DELETE');
            }
            else {
               throw new Error('No such controller');
            }
         }
      } catch (e) {
         logger.error(e);
         res.send(404, e.toString());
      }

   }, function () {
      res.send({
         statusMessages : [{
            severity : 'error',
            text : 'Error validating rest query'
         }]
      });
   });

});

app.get('**main-built-*-cached.js', function (req, res) {
   var fname = __dirname + '/../build/main-built-' + req.params[2] + '-cached.js';
   fs.readFile(fname, function (err, data) {
      if (err) {
         data = 404;
      }
      else {
         data = (data || '').toString().replace(/\{\{serverURLPlaceholder}}/g, appConfig.serverURL);
      }
      res.send(data);
   });
});


app.get('/:application', function (req, res) {
   if(isActualVersionOfBrowser(req)) {
        if (!appConfig.isDev) {
           if (req.url === '/favicon.ico') {
             res.send(404, '/favicon.ico');
           }
           else {
              try {
               var indexData = fs.readFileSync(__dirname + '/../build/index_' + req.params.application + '.html');
                indexData = indexData.toString();
               if(appConfig.hasOwnProperty('CDNHostName')) {
                  var serverURL = appConfig.serverURL;
                  var host = serverURL.split( '/' )[2];
                  var CDNurl = serverURL.replace(host, appConfig.CDNHostName);
                  indexData = indexData.replace(/main-built/g, CDNurl + req.params.application + '/main-built');
                  indexData = indexData.replace(/loader/g, CDNurl + req.params.application + '/loader');
                }

               if(req.useragent.isWindows) {
                  indexData = indexData.replace('dropcap-shifting', '');
               }

                res.contentType('text/html');
                res.send(indexData);
              }
              catch (e){
                logger.error(e);
                res.send(404);
              }
           }
        }
   }
   else {
       logger.trace('Unsupported browser ' + req.useragent.browser + ': ' + req.useragent.version);
       fs.readFile(__dirname + '/../app/modules/bootstrap/UnsupportedBrowser.html', function(err, data){
           if(err){
               logger.error(err);
           }
           else{
               data = data.toString();
               res.set('Content-Type', 'text/html');
               res.send(data);
           }
       });
   }
});

app.get('/swagger/*.html', function (req, res){
   fs.readFile(__dirname + '/../' + req.url.replace(/\.\./g, ''), function(err, data){
      if(err || !data){
         data = '';
      }
      else {
         data = data.toString().replace('##currentURL##', appConfig.serverURL);
      }
      res.send(data);
   });
});

app.use('/swagger', express.static(__dirname + '/../swagger'));

app.get('/logs/dbvalidation.trace', function (req, res, next) {
   res.set('Content-Type', 'text/plain');
   fs.readFile(__dirname + '/../logs/dbvalidation.trace', function(err, data){
      if(err){
         res.send(404);
      }
      else {
         res.send(data);
      }
   });
});

function cachingLayer(req, res, next) {
    /*
     *     Http headers:
     *        - Cache-Control: max-age=31557600
     *        - Expires: "one year from now"
     *
     */
   var now = new Date();
   var oneYearSec = 365 * 24 * 60 * 60;
   var oneYearMSecFromNow = now.getMilliseconds() + oneYearSec * 1000;
   res.cacheControl({maxAge: oneYearSec});
   res.setHeader('Expires', oneYearMSecFromNow);
   if(next){
   next();
}
}


app.get('**-cached.js', cachingLayer);
app.get('**.woff', cachingLayer);
app.get('**.otf', cachingLayer);
app.get('**.ttf', cachingLayer);




var basePath = '';
if (!appConfig.isDev) {
  basePath = 'build/out';
}
app.use('/admin', express.static(__dirname + '/../' + basePath));
app.use('/editor', express.static(__dirname + '/../' + basePath));
app.use('/portal', express.static(__dirname + '/../' + basePath));
app.use('/vocabulary', express.static(__dirname + '/../' + basePath));
app.use('/reader', express.static(__dirname + '/../' + basePath));

var server = app.listen(appConfig.listenPort, function(){
    logger.info('Server listen at ' + server.address().address + ':' + server.address().port);
});
