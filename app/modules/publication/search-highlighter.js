define([
   /*'underscore',*/
   /*'publication/tools/locator-tools',*/
   'publication/dom-utils/text-utils',
   'publication/highlighter',
   'underscore',
   /*'publication/locator'*/
], function(/*_, LocatorTools, */ TextUtils, Highlighter, _/*, Locator*/) {
   'use strict';

   var SearchHighlighter = {
    /**
     *
     * @param {Array.<string>} words
     * @param {Element} element
     * @param {string} decoratorClassName
     */
    decorateSearchWords: function decorateSearchWords(words, element, decoratorClassName) {
       var preparedText = TextUtils.extractContent(element);
       var searchTermsRealOffsets = TextUtils.locateSearchTermsInText(words, preparedText);
       var searchTermsStableOffsets = TextUtils.turnIntoStableOffsets(searchTermsRealOffsets, preparedText);
       
       Highlighter.decorateStableOffsets(searchTermsStableOffsets, element, decoratorClassName);
    },
    /**
     * @param  {Array.<string>} quotes
     * @param  {Element} element
     * @param  {string} decoratorClassName
     */
    decorateSearchQuotes: function decorateSearchQuotes(quotes, element, decoratorClassName) {
        var preparedText = TextUtils.extractContent(element);
        var quotesRealOffsets = [];
        _.each(quotes, function(quote){
          [].push.apply(quotesRealOffsets, TextUtils.searchQuoteRealOffsets(preparedText, quote));
        });
        quotesRealOffsets = TextUtils.normalizingOverLoops(quotesRealOffsets);
        var searchTermsStableOffsets = TextUtils.turnIntoStableOffsets(quotesRealOffsets, preparedText);
  
        Highlighter.decorateStableOffsets(searchTermsStableOffsets, element, decoratorClassName);
    },
    undecorateByClass: Highlighter.undecorateByClass.bind(Highlighter)
   };

   return SearchHighlighter;
});