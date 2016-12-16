Feature: Editor

Scenario: Import flashcard from quizlet

	When I click button ImportButton
	Then we should see flashcard popup FlashcardPopup
	When user clicks save FlashcardSaveButton
	Then we should see content BookContent
#	When I click extra button BookExtraButton
#	When I click extra button BookExtraButton
#	Then We should see extra frame ExtraFrame

	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see extras ExtrasItem
	When I choose extras ExtrasItem
	Then We should see extra popup ExtraFrame

	Given I select data area editor
	When user clicks link ExercisesLink
	Then ExercisesTab tab is opened	
	Then we should see flashcard [FlashcardName] in FlashcardTab2

Where:
	FlashcardName             |Description
	FlashcardNameFromSource   |Source is quizlet

