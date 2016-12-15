define([
   'module',
   'swComponentFactory',
   'jquery',
   'URIjs',
   'text!./TableOfContents.html',
   'less!./TableOfContents.less'
], function(module, swComponentFactory, $, URI, template){
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      controller: ['$scope', 'swReaderService', 'swTableOfContentsService',
      function($scope, swReaderService, swTableOfContentsService){
          
          $scope.swInit = function(){
             var packageDocument = swReaderService.getPackageDocument();
             
             packageDocument.generateTocListDOM(function(dom){
                $('script', dom).remove();
                var tocNav;
                var $navs = $('nav', dom);
                Array.prototype.every.call($navs, function(nav){
                    if (nav.getAttributeNS('http://www.idpf.org/2007/ops', 'type') === 'toc'){
                        tocNav = nav;
                        return false;
                    }
                    return true;
                });
                
                var tocHtml = (tocNav && $(tocNav).html()) || $('body', dom).html() || $(dom).html();
                var tocUrl = packageDocument.getToc();
                
                $('#reader-toc-body').html(tocHtml);
                
                $('#reader-toc-body').on('click', 'a', function(){
                    var href = $(this).attr('href');
                    var aricleUrl = tocUrl ? new URI(href).absoluteTo(tocUrl).toString() : href;
                    
                    var location = swReaderService.getBookKey().location;
                    var _id = swReaderService.getBookKey()._id;
                    
                    swTableOfContentsService.onTOCItemClicked({
                       _id : _id,
                       location : location,
                       openBookPosition : decodeURIComponent(aricleUrl)
                    });
                    
                    return false;
                });
            });
          };
          
      }]
   });
});