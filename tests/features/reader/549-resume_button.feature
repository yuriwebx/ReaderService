Feature: Reader

Scenario: Test Resume button

	Given I select data area reader
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper

	Given I select data area common
###	
#	When user clicks button ResumeReadingButton
#	When user clicks button ResumeButton
#	Then Last book content BookContent is visible
#	When user clicks button StudyButton
#	When user clicks button StudyButton
###

	When I toggle menu ToggleMenu
	When I toggle menu ToggleMenu
	Then We should see resume ResumeStudyButton
#	When user clicks button ResumeStudyButton
	When I click item ResumeReadingItem
	