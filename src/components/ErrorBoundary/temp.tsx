summaryCard: {
  width: "100%",
  borderRadius: 20,
  overflow: "hidden",
  elevation: 4,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  marginBottom: 16, // Add spacing between cards if multiple summaries
},
summaryHeader: {
  padding: 18,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(226, 232, 240, 0.8)",
  backgroundColor: "rgba(59, 130, 246, 0.08)",
},
summaryHeaderText: {
  fontSize: 20,
  fontWeight: "700",
  textAlign: "center",
  letterSpacing: -0.5,
  color: "#1E40AF",
},
titleContainer: {
  flexDirection: "row",
  alignItems: "flex-start",
  padding: 20,
  paddingBottom: 16,
},
titleIcon: { 
  marginRight: 14, 
  marginTop: 2,
  color: "#3B82F6", // Add consistent color for icons
},
summaryTitle: { 
  fontSize: 22, 
  fontWeight: "600", 
  flex: 1, 
  lineHeight: 28,
  color: "#1E293B", // Add explicit color for better readability
},
metaContainer: { 
  padding: 20, 
  paddingTop: 0, 
  paddingBottom: 24,
  gap: 16, // Add consistent spacing between metadata items
},
dateContainer: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 16,
  paddingVertical: 8,
  paddingHorizontal: 12,
  backgroundColor: "rgba(243, 255, 239, 0.84)",
  borderRadius: 12,
  borderWidth: 0.5,
  borderColor: "rgba(220, 252, 231, 0.7)", // More specific border color
  alignSelf: "flex-start",
},
dateText: { 
  marginLeft: 10, 
  fontSize: 15, 
  fontWeight: "500", 
  color: "#475569"
},
summaryContent: { // Add new style for consistent content padding
  paddingHorizontal: 20,
  paddingVertical: 16,
},
summaryText: { // Add new style for summary text
  fontSize: 16,
  lineHeight: 24,
  color: "#334155",
},
priorityContainer: { 
  flexDirection: "row", 
  marginTop: 4,
  alignItems: "center", // Ensure alignment
},
priorityChip: { 
  height: 36, 
  paddingHorizontal: 12, 
  borderRadius: 18,
  flexDirection: "row", // Allow for icon + text
  alignItems: "center",
  justifyContent: "center",
  marginRight: 8, // Add spacing between multiple chips
},
priorityText: { // Add new style for priority text
  fontWeight: "600",
  fontSize: 14,
  color: "#FFFFFF",
  marginLeft: 6,
},
summaryFooter: { // Add new style for footer area
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderTopWidth: 1,
  borderTopColor: "rgba(226, 232, 240, 0.8)",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
actionLink: { // Add new style for action links in summary
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 6,
  paddingHorizontal: 10,
},
actionLinkText: { // Add new style for action link text
  fontSize: 14,
  fontWeight: "600",
  color: "#3B82F6",
  marginLeft: 6,
},