Feature: Editor

Scenario: Test Book Extra button
###	
	Given I select data area editor
	When I click extra button BookExtraButton
#	When I click extra button BookExtraButton
	Then We should see extra frame ExtraFrame
###
###
	Given I select data area common
	
#	When I hover on ToolbarWrapper
#	Then we should see toolbar ToolbarWrapper	
	When I click button book extra BookExtraButton
	Then Popup ExtraPopup is displayed

	Then And we should see Info button InfoButton
	Then And we should see Annotations button AnnotationsButton
	Then And we should see Exercises button ExercisesButton
###
	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see extras ExtrasItem
	When I choose extras ExtrasItem
	Then We should see extra popup ExtraFrame