Feature: Editor

Scenario: Select snippet
	
	Given I select data area editor
###    
	When I create study guide CreateStudyGuideButton
#	Then we should see popup BookPopup
    Then We should see StudyGuideHeaderText in header StudyGuideHeader

	When user clicks link ExercisesLink
	Then ExercisesTab tab is opened
	
	When user clicks out of study guide OutOfStudyGuidePopup
	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible
	
	Given Go top Top
###	
	Given Go top Top

	When user selects snippet from Point3 to Point1
#	When user doubleclicks on Point999
	Then we should see context menu ContextMenu and button AddFlashcard