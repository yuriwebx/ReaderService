Feature: Editor

Scenario: Select snippet
###	
	Given I select data area editor
    When I create study guide CreateStudyGuideButton
	Then we should see popup BookPopup
    Then We should see StudyGuideHeaderText in header StudyGuideHeader
	When user clicks link ExercisesLink
	Then exercises tab is open
###
	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible
	
#	Given Go top Top
#	Given Go top Top

	When user selects snippet from Point5 to Point5
#	When user selects snippet from Point9 to Point10
	Then we should see context menu ContextMenu and button AddQuiz 