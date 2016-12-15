/*jslint node: true */
/*jslint unused: false */
'use strict';

var config = require(__dirname + '/../utils/configReader.js');
module.exports = {
   GET :  function (req, res) {
         res.send({
            version: config.buildVersion,
            buildnumber: config.buildnumber,
            builddate: config.builddate,
            apkHash: config.apkHash
         });
   }
};