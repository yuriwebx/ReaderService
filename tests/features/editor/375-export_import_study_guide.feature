Feature: Editor

Scenario: Import Study Guide
###
	Given I select data area editor
	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible
###	
	Given I select data area common

#	When I click button library LibraryButton
#	Then Library list LibraryList is displayed	

	When I toggle menu ToggleMenu
	When I toggle menu ToggleMenu
	Then We should see extras LibraryItem
	When I choose extras LibraryItem
	When I choose extras LibraryItem	
    Given I introduce BookName13 in FilterBox
    Then We should see FilterBox has matching SeekingBook13
###
	When I open book SeekingBook13
    Then We should see BookContent view
###
	Given I select data area editor
	
#	When I click on cover of book BookCover
	When I click on info of book TestGuideName2
	Then We should see popup BookInfoPopup
	
	When I click on link ImportStudyGuide
	Then We should see code textbox CodeTextBox2
	
#	When I insert 2 value [ImportValue] to CodeTextBox2
#	Then CodeTextBox2 value = [Importvalue]
	When I click button ImportButton2
	Then we should see book content BookContent
#	When I click extra button BookExtraButton
#	Then We should see extra frame ExtraFrame
#	When user clicks link ExercisesLink
#	Then ExercisesTab tab is opened	

Where:

TestGuideName2  			| TestGuide2   				   | F1            | Q1        |ImportValue
Book Notes for The Republic	| Study Guide for The Republic |TestFlashcard1 | TestQuiz1 |{  "_id": "28a4afd7e91f06a50dc8fa7fce2ca4e2",  "title": "Study Guide for The Republic", "author": "Sarah Editor",  "description": "The Republic is a Socratic dialogue, written by Plato around 380 BC, concerning the definition of justice, the order and character of the just city-state and the just man, reason by which ancient readers used the name On Justice as an alternative title (not to be confused with the spurious dialogue also titled On Justice).",  "category": "study guide",  "coverId": "StudyGuide74c4ce4c9acc3816c6c6233a201b9454",  "annotations": [    {      "id": "229a49f6-f95c-4727-b1c4-f9835829beb2",      "category": "default",      "start": {        "id": "para_6",       "offset": 54      },      "end": {        "id": "para_6",        "offset": 57      },      "note": "",      "createdAt": 1433838784782,      "modifiedAt": 1433838784782,      "studyGuide": true    }  ],  "bookmarks": [],  "comments": [],  "categories": [],  "type": "materials",  "tests": []}
###