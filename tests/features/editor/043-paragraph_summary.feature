Feature: Editor

Scenario: Test Paragraph summary

	Given I select data area editor
	When user clicks link ExercisesLink
	Then ExercisesTab tab is opened
	
	Then Paragraph summary button ParagraphSummaryButton is displayed
	When user clicks button ParagraphSummaryButton
#	When user clicks button ParagraphSummaryButton
	Then Button ParagraphSummaryButtonSwitched is switched
	Then field MinimumParagraphWordsField is displayed
	Given Should be input [Number] into MinimumParagraphWordsField
	Then Check [Number] existing in MinimumParagraphWordsField
	When user clicks button ParagraphSummaryButton
	
	When user clicks link InfoLink
	
Where:
		Number
		3
