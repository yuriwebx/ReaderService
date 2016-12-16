Feature: Editor

Scenario: Create annotation

	Given I select data area editor

#	When user clicks out of study guide OutOfStudyGuidePopup
	
	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible
	
#	Given Go top Top
	Given Go top Top

	When user selects snippet from [Point1] to [Point2]
#	When user selects snippet from [Point1] to [Point2]
	Then we should see context menu ContextMenu and button AddAnnotation	

	When user clicks note button AddAnnotation
	Then we should see annotation popup AnnotationPopup
	Then we should see textbox AnnotationBox
	Then we should see selector AnnotationTypeSelector
	When user inputs text [TestWord] in AnnotationBox
	When user selects type [Type] in AnnotationTypeSelector AnnotationTypeList as [Item] item
	
	When user clicks out of note block OutOfStudyGuidePopup
#	When I click extra button BookExtraButton
#	When I click extra button BookExtraButton

	Given I select data area common
#	When I hover on ToolbarWrapper
#	Then we should see toolbar ToolbarWrapper	
	When I toggle menu ToggleMenu
	Then We should see extras ExtrasItem
	When I choose extras ExtrasItem
	Then We should see extra popup ExtraFrame

	Given I select data area editor
	When user clicks link AnnotationsLink
	Then AnnotationsTab tab is opened
	
	Then we should see annotation [TestWord] in [AnnotationComment]
#	Then we should see [Type] Snippet is marked with colour [Colour]

	Where:
	TestWord |Colour |Type     |Point1 |Point2 |AnnotationComment| Item
	test1    |#ffe100|highlight|Point5 |Point5 |NoteComment1	 | 1
	test2    |#d94336|remember |Point5 |Point5 |NoteComment2 	 | 2
	test3    |#d08939|important|Point5 |Point5 |NoteComment3 	 | 3
	test4    |#4eae33|reread   |Point5 |Point5 |NoteComment4	 | 4
	test5    |#b6b82c|recheck  |Point5 |Point5 |NoteComment5	 | 5
	test6    |#00a4e0|names    |Point5 |Point5 |NoteComment6	 | 6
	test7    |#4152a0|location |Point5 |Point5 |NoteComment7	 | 7
#	test8    |#999999|custom1  |Point5 |Point5 |NoteComment8	 | 8