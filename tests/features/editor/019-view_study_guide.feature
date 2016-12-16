Feature: Editor

Scenario: View study guide
	
	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see extras ExtrasItem
	When I choose extras ExtrasItem
	Then We should see extra popup ExtraFrame
	
	Given I select data area editor

#	When I click extra button BookExtraButton
#	Then We should see extra frame ExtraFrame
	
	When user clicks link InfoLink
	Then InfoTab tab is opened
	
#    Then We should see StudyGuideHeaderText in header StudyGuideHeader
###
	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible
###	