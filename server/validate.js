/*jslint node: true */
/*jslint camelcase: false */
'use strict';
var logger = require(__dirname + '/utils/logger.js').getLogger(__filename);

logger.info('Validator process started');
require('./DBSchemas/validation/validation.js')().then(
   function(){
      logger.log('Validation finished');
   },
   function(err){
      logger.warn('Validation failed for some reason.');
      if(err){
         logger.error(err);
      }
   }
);

