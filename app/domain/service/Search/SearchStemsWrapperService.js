define([
  'ngModule',
  'underscore',
  'publication/search-highlighter',
  'publication/dom-utils/text-utils'
], function(ngModule, _, SearchHighlighter, TextUtils) {
  'use strict';

  return ngModule.service('SearchStemsWrapperService', ['$window', '$document', function($window, $document) {
    /* ---api--- */
    this.highlightSearchResultInSentence = highlightSearchResultInSentence;
    this.highlightSearchSentenceInParagraph = highlightSearchSentenceInParagraph;
    this.highlightSearchResult = highlightSearchResult;
    this.highlightSentence = highlightSentence;
    this.undecorateSearchSentence = undecorateSearchSentence;
    /* --- impl --- */


    /**
     * Transforms search results to more readable form
     */
    
    var searchWordDecoratorClassName = 'search-req';
    var quoteDecoratorClassName = 'search-req';
    var searchSentenceDecoratorClassName = 'search-sentence';
    var decoratorClassNames = [searchWordDecoratorClassName, quoteDecoratorClassName, searchSentenceDecoratorClassName];

    function highlightWords(element, wordForms) {
      SearchHighlighter.decorateSearchWords(wordForms, element, searchWordDecoratorClassName);
    }

    function highlightQuotes(element, quotes) {
      SearchHighlighter.decorateSearchQuotes(quotes, element, quoteDecoratorClassName);
    }

    function undecorateSearchSentence() {
      var undecorateContainer = _.first($document.find('.nota-wrapper'));
      if (!undecorateContainer) {
          return;
      }
      _.each(decoratorClassNames, function(decoratorClassName){
        SearchHighlighter.undecorateByClass(decoratorClassName, undecorateContainer);
      });
    }

   function highlightSentence(element, foundSentence) {
      if (!element) {
         return;
      }
      var sentenceElement = $window.document.createElement('DIV');
      
      sentenceElement.innerHTML = foundSentence;
      var qouteFoundSentence = TextUtils.extractContent(sentenceElement);
      var quote = TextUtils.createQuoteFromSentence(qouteFoundSentence);

      SearchHighlighter.decorateSearchQuotes([quote], element, searchSentenceDecoratorClassName);
   }

    /**
     * Highlights occurrences of wordForms and quotes in sentence, applying highlighter
     * function to element
     *
     * @param {object} element
     *           element to highlight
     * @param {Array<String>} wordForms
     *           array of tokens to search in sentence
     * @param {Array<String>} quotes
     *           array of quotes to search in sentence
     */
   function highlightSearchResult(element, wordForms, quotes) {
      if (wordForms.length !== 0) {
         highlightWords(element, wordForms);
      }
      if (quotes.length !== 0) {
         highlightQuotes(element, quotes);
      }
   }

   function highlightSearchSentenceInParagraph(paragraph, sentence) {
    var element = $window.document.createElement('DIV');
    element.innerHTML = paragraph;
    highlightSentence(element, sentence);
    return element.innerHTML;
   }

   function highlightSearchResultInSentence(sentence, wordForms, quotes) {
      var element = $window.document.createElement('DIV');
      element.innerHTML = sentence;
      highlightSearchResult(element, wordForms, quotes);
      return element.innerHTML;
   }

  }]);
});
