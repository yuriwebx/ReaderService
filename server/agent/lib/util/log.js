"use strict";
// const os = require('os');
const utils = require('util');

const logger = require('../../../utils/logger');


// const DEFAULT = '\x1b[m';
// const RED_ON_BLACK = '\x1b[31m';
//
// make log more informative
// module.exports = (function(){
//   "use strict";
//
//   function log(){
//     process.stdout.write('[' + (new Date().toISOString()) + '] ' + utils.format.apply(utils, arguments) + os.EOL);
//   }
//
//   function err(){
//     process.stderr.write(RED_ON_BLACK + '[' + (new Date().toISOString()) + '] ' + utils.format.apply(utils, arguments) + DEFAULT + os.EOL );
//     // process.stderr.write('\033[31m' + '[' + (new Date().toISOString()) + '] ' + utils.format.apply(utils, arguments) + '\033[m' + '\n' );
//   }
//
//   console.log = log;
//   console.error = err;
//
// })();

module.exports = {

  getLogger: function(filename) {
    const log = logger.getLogger(filename, 'agent');

    var obj = {};

    Object.keys(log).forEach(method=>{
      obj[method] = function() {
        return log[method].apply(log, [utils.format.apply(utils, arguments), true]);
      };
    });

    return obj;
  }
};