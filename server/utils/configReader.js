/*jslint node: true */
   'use strict';
   var path = __dirname + '/../../config/',
       fs   = require('fs');

   var _configs = [
      'agent.config.json',
      'default.config.json',
      'default.srv.config.json',
      'build.config.json',
      'deployment.config.json',
      'local.config.json'
   ];
   var _clientConfigs = [
      'default.config.json',
      'build.config.json',
      'deployment.config.json'
   ];


   function _loadJSON(fileName) {
      fileName = path + fileName;
      if (fs.existsSync(fileName)) {
         try {
            return JSON.parse(fs.readFileSync(fileName));
         } catch (e) {
            console.error('can\'t parse file:', fileName);
         }
      }
      else{
         console.error('did not find file:', fileName);
      }
      return {};
   }

   function extend(obj /* ...sources */ ) {
      var sources = Array.prototype.slice.call(arguments, 1);
      sources.forEach(function(source) {
         Object.keys(source).forEach(function(key) {
            if (obj.hasOwnProperty(key) && isObject(obj[key])) {
               obj[key] = extend(obj[key], source[key]);
            } else if(typeof source[key] !== "undefined"){
               obj[key] = source[key];
            }
         });
      });
      return obj;
   }

   function isObject(value) {
      return !!(value && Object.prototype.toString.call(value) === '[object Object]');
    }

   var config = extend.apply(null, _configs.map(_loadJSON));
   var clientConfig = extend.apply(null, _clientConfigs.map(_loadJSON));
   config.clientConfig = clientConfig;
   var localReaderURL = 'http://localhost:' + config.listenPort + '/reader/index.html#/';
   var buildURL = config.serverURL ? config.serverURL + 'reader/#/' : localReaderURL;
   // environment config
   var environment = {
      agent:{
         url: process.env.AGENT_URL || config.agent.url
      },
      listenPort: process.env.PORT || config.listenPort,
      libraryDir: process.env.LIBRARY || config.libraryDir,
      isDev: config.isDev === undefined ? process.env.NODE_ENV !== 'production' : config.isDev,
      buildURL: buildURL
   };

   config = extend.apply(null, [config, environment]);


   ////
   module.exports = config;

