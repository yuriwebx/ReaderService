/*jslint node: true */
/*jslint camelcase: false */
'use strict';
var config = require(__dirname + '/../utils/configReader.js');
var oauth = require('./bl/externalAuthentications.js');
var logger = require(__dirname + '/../utils/logger.js').getLogger(__filename);

var btoa = function(str) {
   var buffer;

   if (str instanceof Buffer) {
      buffer = str;
   }
   else {
      buffer = new Buffer(str.toString(), 'binary');
   }

   return buffer.toString('base64');
};


module.exports = {
   'GET' : function (req, res) {
      var provider = req.param('provider', '');
      var returnURI = req.param('returnURI', '');
      var URL = '';
      var state = {
         provider : provider,
         link : returnURI
      };
      if (config.oauth.services.hasOwnProperty(provider)) {
         if (config.oauth.services[provider].getToken) {
            URL = config.oauth.services[provider].getToken;

            URL += encodeURIComponent(config.oauth.OAuthRedirectPage) + '&state=' +  btoa(JSON.stringify(state));
            res.redirect(URL);
         }
         else if (config.oauth.services[provider].requestToken) {
            var data = {
               callback : config.oauth.OAuthRedirectPage + (config.oauth.OAuthRedirectPage.indexOf('?') > -1 ? '&' : '?') + 'state=' + btoa(JSON.stringify(state))
            };

            oauth.twitterRequest('requestToken', data).then(
               function(query){
                  if(query.indexOf('oauth_token') > -1){
                     res.redirect('https://api.twitter.com/oauth/authorize?' + query);
                  }
                  else {
                     logger.warn('Twitter oauth problem: ' + query);
                     res.send(404);
                  }
               },
               function(err){
                  logger.error(err);
                  res.send(404);
               }
            );
         }
      }
      else {
         res.send(404);
      }
   }
};
