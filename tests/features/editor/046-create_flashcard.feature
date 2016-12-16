Feature: Editor

Scenario: Create flashcard

	When user clicks flashcard button AddFlashcard
	Then we should see flashcard popup FlashcardPopup
	When user inputs [FlashcardName] in FlashcardNameBox
	When user inputs [Description] in DescriptionBox
	When user inputs [Question] in QuestionBox
	When user inputs [IncorrectAnswer1] in IncorrectBox1
	When user inputs [IncorrectAnswer2] in IncorrectBox2
	When user inputs [IncorrectAnswer3] in IncorrectBox3
	When user inputs [CorrectAnswer] in CorrectBox
#	When user uploads [Image] through AddImageInput
#	When user uploads [Audio] through AddAudioInput
	When user clicks save FlashcardSaveButton
	Then we should see content BookContent
#	When I click extra button BookExtraButton
#	When I click extra button BookExtraButton

	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see extras ExtrasItem
	When I choose extras ExtrasItem
	Then We should see extra popup ExtraFrame

	Given I select data area editor
	When user clicks link ExercisesLink
	Then ExercisesTab tab is opened
	
	Then we should see flashcard [FlashcardName] in FlashcardTab

Where:
		FlashcardName   |Description| Question    | IncorrectAnswer1| IncorrectAnswer2| IncorrectAnswer3| CorrectAnswer | Image								| Audio
		FlashcardName   |Description|Test Question| Test Answer 1   | Test Answer 2   | Test Answer 3   | Correct Answer| data//stone_composition.jpg		| data//Kalimba.mp3