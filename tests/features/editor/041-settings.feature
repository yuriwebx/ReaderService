Feature: Editor

Scenario: Test Settings

	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see extras ReadModeSettingsItem
	When I choose extras ReadModeSettingsItem
#	Then We should see settings popup ReaderModePopup
###
	Given I select data area editor
	When I hover on ToolbarWrapper
	Then We should see reader mode ReaderModeLink
	When I click on reader mode ReaderModeLink
	Then We should see settings popup ReaderModePopup
###	
	Given I select data area common
	
Scenario: Test themes
	When I click on theme button SepiaThemeButton
	Then The body is affected by SepiaTheme
	
	When I click on theme button NightThemeButton
	Then The body is affected by NightTheme
	
	When I click on theme button DefaultThemeButton
	Then The body is affected by DefaultTheme

Scenario: Test fonts

	When Select font fontItem1
	Then Check style styleItem contains styleItemValue1
	When Select font fontItem2
	Then Check style styleItem contains styleItemValue2
	When Select font fontItem3
	Then Check style styleItem contains styleItemValue3
	When Select font fontItem4
	Then Check style styleItem contains styleItemValue4
#	When Select font fontItem5
#	Then Check style styleItem contains styleItemValue5
#	When Select font fontItem6
#	Then Check style styleItem contains styleItemValue6
	When Select font fontItem1

Scenario: Test font size
	
	When I select FontIncrease FontDecreaseButton
	Then Style StyleFontSize has font size StyleFontSizeValue90
	When I select FontIncrease FontDecreaseButton
	Then Style StyleFontSize has font size StyleFontSizeValue80
	
	When I select FontDecrease FontIncreaseButton
	Then Style StyleFontSize has font size StyleFontSizeValue90
	When I select FontDecrease FontIncreaseButton
	Then Style StyleFontSize has font size StyleFontSizeValue100
	
#	When I click on theme button SepiaThemeButton
#   Then The body is affected by SepiaTheme

	Given I select data area editor
	
#	When I click out of popup OutOfPopup
	When I click out of popup OutOfPopup
	Then We should close popup and see BookContent
