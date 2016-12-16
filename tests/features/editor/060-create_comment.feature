Feature: Editor

Scenario: Create comment

	Given I select data area editor

	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible
	
	Given Go top Top

	When user selects snippet from [Point1] to [Point2]
	Then we should see context menu ContextMenu and button AddParagraphNote

	When user clicks note button AddParagraphNote
	Then we should see annotation popup CommentPopup
	Then we should see textbox CommentBox
	Then we should see selector CommentTypeSelector
	When user inputs text [TestWord] in CommentBox
	When user selects type [Type] in CommentTypeSelector CommentTypeList as [Item] item
	When user selects comment position [CommentPostion]
	
	When user clicks out of note block OutOfStudyGuidePopup
#	When user clicks out of note block OutOfStudyGuidePopup
#	When I click extra button BookExtraButton
#	When I click extra button BookExtraButton

	Given I select data area common
	When I toggle menu ToggleMenu
	Then We should see extras ExtrasItem
	When I choose extras ExtrasItem
	Then We should see extra popup ExtraFrame

	Given I select data area editor
	
	When user clicks link AnnotationsLink
	Then AnnotationsTab tab is opened	
	
	Then we should see annotation [TestWord] in [Comment]
	
	When user clicks out of study guide OutOfStudyGuidePopup
#	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible

Where:
	TestWord |Colour |Type     |Point1 |Point2 |  Comment        | Item | CommentPostion
	comment1 |#ffe100|recheck  |Point5 |Point5 |NoteComment11	 | 5	| AboveButton
	comment2 |#d94336|remember |Point5 |Point5 |NoteComment12 	 | 2	| BelowButton
