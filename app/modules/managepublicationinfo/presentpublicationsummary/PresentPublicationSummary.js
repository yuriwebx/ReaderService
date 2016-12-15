define([
       'module',
       'swComponentFactory',
       'text!./PresentPublicationSummary.html',
       'less!./PresentPublicationSummary'
    ],
    function ( module, swComponentFactory, template ) {
       'use strict';
       swComponentFactory.create({
          module: module,
          template: template,
          isolatedScope: {
             publication: '='
          },
          controller: [
//             '$scope',
             function ( /*$scope*/ ) {
               //reading time count
             }]
       });
    });
