Feature: Editor

Scenario: Use dictionary
	
	Given I select data area editor
	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible

	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see dictionary DictionaryItem
	When I choose dictionary DictionaryItem
	Then DictionaryPage occurs on the screen
	Then And SearchBox is available
	Given I input [Word] into SearchBox
	Then Search result SearchResult appears
	
	Where:
		Word
		republic
