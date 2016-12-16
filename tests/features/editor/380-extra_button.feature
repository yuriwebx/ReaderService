Feature: Editor

Scenario: Test Book Extra button
###	
	Given I select data area editor
	When I click extra button BookExtraButton
	Then We should see extra frame ExtraFrame
###
	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see extras ExtrasItem
	When I choose extras ExtrasItem
	When I choose extras ExtrasItem
	Then We should see extra popup ExtraFrame
	
	Given I select data area editor
	
