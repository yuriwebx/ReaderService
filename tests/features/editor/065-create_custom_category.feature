Feature: Editor

Scenario: Create custom category

	Given I select data area editor

	Given Go top Top

	When user selects snippet from [Point1] to [Point2]
	Then we should see context menu ContextMenu and button AddAnnotation

	When user clicks note button AddAnnotation
	Then we should see annotation popup AnnotationPopup
	Then we should see textbox AnnotationBox
	Then we should see selector AnnotationTypeSelector
	
	When user inputs text [TestWord] in AnnotationBox
	When user clicks on selector AnnotationTypeSelector
	When user selects new AddNewMarkLink
	Then We should see mark block MarkBlock
	
	Given Should be input [Type] into markNameInput
	When I select color in selectColorCell
	When I click on sign addColorSign
#	Then We should see new item [Type] in NotesCategoryMenuList
	Then We should see new item [Type] in AnnotationTypeList
	
#	When user selects type [Type] in AnnotationTypeSelector AnnotationTypeList as [Item] item

	When user clicks out of note block OutOfStudyGuidePopup
#	When I click extra button BookExtraButton
#	Then we should see annotation [TestWord] in [AnnotationComment]

Where:
	TestWord |Colour |Type     |Point1 |Point2 |AnnotationComment| Item
	test1    |#999999|custom1  |Point5 |Point5 |NoteComment8	   | 8
