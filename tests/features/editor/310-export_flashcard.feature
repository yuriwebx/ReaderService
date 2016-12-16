Feature: Editor

Scenario: Export flashcard

	Given I select data area editor
	Given Go top Top
	When I select Flashcard inside content
	Then we should see FlashcardPopup popup
	
	When I click on link Export
#	Then We should see code textbox CodeTextbox
	When I click back BackButton
	Then we should see flashcard popup FlashcardPopup
	When I click on link CloseButton
	Then Content BookContent is visible