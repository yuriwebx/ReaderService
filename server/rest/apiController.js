/*jslint node: true */
/*jslint unused: false */
(function () {
   'use strict';

   var fs = require('fs');
   var methods = "post|get|put|delete|options".split('|');
   var restjson, dbjson;
   try {
      restjson = convertAmandaToSwagger(JSON.parse(fs.readFileSync(__dirname + '/../DBSchemas/validation/RESTAPIschema.json').toString()), 'BF');
      dbjson = convertAmandaToSwagger(JSON.parse(fs.readFileSync(__dirname + '/../DBSchemas/validation/DBschema.json').toString()), 'DB');
   }
   catch (e) {
      console.error(e.stack);
   }

   function convertAmandaToSwagger(obj, tag) {
      var res = {
         "swagger" : "2.0",
         "info" : {
            "description" : "IRLS " + tag + " schema",
            "version" : "1.0.0"
         },
         "host" : "irls.isd.dp.ua",
         "basePath" : "/v2",
         "tags" : [
            {
               "name" : tag,
               "description" : "Everything about " + tag + ""
            }
         ],
         "schemes" : ["http"],
         "paths" : {}
      };
      for (var type in obj) {
         if (obj.hasOwnProperty(type)) {
            if (obj[type].post || obj[type].get || obj[type].delete || obj[type].put) {
               res.paths[type] = {};
               for (var method in obj[type]) {
                  if (obj[type].hasOwnProperty(method) && methods.indexOf(method) > -1) {
                     res.paths[type][method] = {
                        tags : [tag],
                        produces : ["application/json"]
                     };
                     insertSchemaIntoPath(res.paths[type][method], obj[type][method].parameters, true);
                     insertSchemaIntoPath(res.paths[type][method], obj[type][method].responses, false);
                  }
               }
            }
            else {
               res.paths[type] = {
                  get : {
                     tags : [tag],
                     produces : ["application/json"]
                  }
               };
               insertSchemaIntoPath(res.paths[type].get, obj[type], true);
            }
         }
      }
      return res;
   }

   function insertSchemaIntoPath(path, schema, isParams) {
      if (isParams) {
         if (!path.hasOwnProperty('parameters')) {
            path.parameters = [];
         }
         for (var j in schema.properties) {
            if (schema.properties.hasOwnProperty(j)) {
               path.parameters.push({
                  name : j,
                  in : 'body',
                  required : !!schema.properties[j].required || (schema.required && schema.required.indexOf(j) !== -1),
                  schema : schema.properties[j]
               });
            }
         }
      }
      else {
         if (!path.hasOwnProperty('responses')) {
            path.responses = {
               '200' : {
                  schema : {}
               }
            };
         }
         path.responses['200'].schema = schema;
      }
   }

   module.exports = {
      GET : {
         db : function (req, res) {
            res.send(dbjson);
         },
         rest : function (req, res) {
            res.send(restjson);
         }
      }
   };
})();
