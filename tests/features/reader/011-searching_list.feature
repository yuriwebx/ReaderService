Feature: Reader
	
Scenario: Test searching list

zsdfvzsdfvzsfv	Given I select data area reader
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper
	Given I select data area common
	When I click on search icon SearchIcon
	Then We should see search popup SearchPopup
	Given I input SearchingText2 into search box SearchTextField
#	When I click on search text icon SearchTextIcon
	Then We should see negative search noPositiveSearchResult
	Given I input SearchingText1 into search box SearchTextField
#	Then We should see positive search noNegativeSearchResult
#	Given I select data area common
	Then We should see searching books list SearchingBooksList
#	Then Search results SearchResultsNumber = [numberOfBooks]
#	Then First book is FirstBook
#	Then We should see search result SearchingBooksList contains SearchingText
#	When I click out of search OutOfSearch
#	Then We can logout

Where:
	numberOfBooks
	90