Feature: Editor

Scenario: Create quiz

	When user clicks quiz button AddQuiz
	Then we should see quiz popup FlashcardPopup
	When user inputs [QuizName] in FlashcardNameBox
	When user inputs [Description] in DescriptionBox
	When user inputs [Question] in QuestionBox
	When user inputs [IncorrectAnswer1] in IncorrectBox1
	When user inputs [IncorrectAnswer2] in IncorrectBox2
	When user inputs [IncorrectAnswer3] in IncorrectBox3
	When user inputs [CorrectAnswer] in CorrectBox
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
	
	Then we should see quiz [QuizName] in QuizTab
	
	Where:
	QuizName|Description| Question    | IncorrectAnswer1| IncorrectAnswer2| IncorrectAnswer3| CorrectAnswer |
	QuizName|Description|Test Question| Test Answer 1   | Test Answer 2   | Test Answer 3   | Correct Answer|