Feature: Reader

Scenario: Test Study Projects button
###
	Given I select data area reader
	When I hover on ToolbarWrapper
	Then we should see toolbar ToolbarWrapper
###
	Given I select data area common
	When I click link StudyProjectsButton
#	When I click link StudyProjectsButton
	Then Library list LibraryList is displayed