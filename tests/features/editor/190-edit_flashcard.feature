Feature: Editor

Scenario: Edit flashcard

	Given I select data area editor
	
	Given Go top Top
	Given Go top Top
	When I select Flashcard inside content
	Then we should see FlashcardPopup popup
	When user adds new questions AddTestQuestion
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
#	When user clicks button CloseButton
#	Then we should see content BookContent

Where:
		FlashcardName   |Description| Question    | IncorrectAnswer1| IncorrectAnswer2| IncorrectAnswer3| CorrectAnswer | Image								| Audio
		FlashcardName   |Description|Test Question| Test Answer 4   | Test Answer 5   | Test Answer 6   |Correct Answer2| data//stone_composition.jpg		| data//Kalimba.mp3