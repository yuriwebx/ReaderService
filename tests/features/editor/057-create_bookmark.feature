Feature: Editor

Scenario: Create and delete bookmark

	Given I select data area editor

	When user clicks out of study guide OutOfStudyGuidePopup
#	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible
	
	Given Go top Top

	When user selects snippet from [Point1] to [Point2]
	Then we should see context menu ContextMenu and button AddBookmark

	When user clicks note button AddBookmark
	Then bookmark BookmarkLabel is added to paragraph
	
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
	
	Then bookmark BookmarkItem is displayed in tab AnnotationsTab
	
	When user clicks out of study guide OutOfStudyGuidePopup
#	When user clicks out of study guide OutOfStudyGuidePopup
	Then Content BookContent is visible

	When user selects snippet from [Point1] to [Point2]
	Then we should see context menu ContextMenu and button RemoveBookmark
	When user clicks note button RemoveBookmark
###	
	When user selects snippet from [Point3] to [Point4]
	Then we should see context menu ContextMenu and button AddBookmark

	When user clicks note button AddBookmark
	Then bookmark BookmarkLabel2 is added to paragraph

	When user clicks out of study guide OutOfStudyGuidePopup
	When user clicks on bookmark BookmarkLabel2	
###
Where:	
			Point1 | Point2	| Point3 | Point4
			Point5 | Point5 | Point3 | Point4