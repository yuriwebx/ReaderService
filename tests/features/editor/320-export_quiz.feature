Feature: Editor

Scenario: Export quiz
	
	Given I select data area editor
	Given Go top Top
	When I select Quiz inside content
	Then we should see FlashcardPopup popup
	When I click on link Export
#	Then We should see code textbox CodeTextbox
#	Then CodeTextbox value != null
	When I click back BackButton
	When I click on link CloseButton
	Then Popup is closed