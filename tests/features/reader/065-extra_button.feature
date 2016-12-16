Feature: Reader

Scenario: Test Book Extra button
###
	Given I select data area reader
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper

	Given I select data area common
	When I click button book extra BookExtraButton
#	When I click button book extra BookExtraButton
#	Then Menu ExtrasMenu is displayed
	Then Popup ExtraPopup is displayed
	Then And we should see Info button InfoButton
#	Then And we should see Bookmarks button BookmarksButton
	Then And we should see Annotations button AnnotationsButton
#	Then And we should see Exercises button ExercisesButton
###
	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see item ExtrasItem
	When I click item ExtrasItem
###	
	When I click item StugyGuidesTab
	When I click item StugyGuidesCheckbox
###