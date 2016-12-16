Feature: Editor
	
Scenario: Test Out of popups

	Given I select data area editor
	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible