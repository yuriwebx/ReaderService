Feature: Editor

Scenario: Import flashcard from quizlet
	
	Given I select data area editor
	Given Go top Top
	Given Go top Top
	When I select Flashcard inside content
	Then we should see FlashcardPopup popup
#	Then we should see flashcard popup FlashcardPopup
	When user inputs [FlashcardName] in FlashcardNameBox
#	When user inputs [Description] in DescriptionBox
#	Given Maximize window
	When I click on import ImportButtonEditor
	When I click on link OtherSourceLink
	Then List is dropped OtherSourceDropDown
	When I choose source OtherSourceItem2

Where:
	FlashcardName             |Description
	FlashcardNameFromSource   |Source is quizlet

