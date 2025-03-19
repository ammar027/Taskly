// Add these imports at the top of your file
import { Alert } from 'react-native';

const NewTask = () => {
  // Keep your existing state variables
  const { colors } = usePaperTheme()
  const { isDarkMode } = useTheme()
  const router = useRouter()
  const realm = useRealm()
  const { user } = useAuth() 
  
  const userId = user?.id || user?._id || user?.userId || (typeof user === 'string' ? user : 'anonymous')
  const noteService = new NoteService(realm, userId)

  // Keep your existing state declarations
  const [recognizing, setRecognizing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [transcript, setTranscript] = useState("")
  
  // Add new state for enhanced speech recognition
  const [currentField, setCurrentField] = useState("title") // Default to title
  const [captureMode, setCaptureMode] = useState(true) // Start in capture mode for title
  const [fieldContent, setFieldContent] = useState({})

  // Enhanced task data structure
  const [taskData, setTaskData] = useState({
    title: "",
    content: "", // This will be our description
    dueDate: "",
    category: "",
    priority: params.priority || "",
    created: null,
  })

  // Define keywords to recognize different fields
  const keywords = {
    TITLE: ['title', 'task title', 'the title', 'title is', 'name', 'task name', 'create a task'],
    DESCRIPTION: ['description', 'details', 'content', 'describe', 'task details', 'the description'],
    DUE_DATE: ['due date', 'deadline', 'due', 'due by', 'when is it due', 'complete by', 'finish by', 'date'],
    CATEGORY: ['category', 'type', 'tag', 'label', 'group', 'the category', 'category is'],
    PRIORITY: ['priority', 'importance', 'urgent', 'high priority', 'low priority', 'medium priority'],
  }

  // Valid categories
  const validCategories = ['Notes', 'Tasks', 'Projects', 'Personal', 'Meetings']
  
  // Valid priorities
  const validPriorities = ['high', 'medium', 'low']

  // Keep your existing useEffect blocks and animations

  // Updated speech recognition event handlers
  useSpeechRecognitionEvent("start", () => {
    setRecognizing(true)
    setRecordingStartTime(Date.now())
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
    setCurrentAction("Listening... Say title, description, due date, or category")
  })

  useSpeechRecognitionEvent("end", () => {
    setRecognizing(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setCurrentAction("Processing your input...")
    
    // If we're in the first step and have a title, move to next step
    if (currentStep === 0 && taskData.title) {
      // Wait a bit before moving to next step to give user time to read
      setTimeout(() => {
        setCurrentStep(1)
        setCurrentAction("Task created! You can now add more details.")
      }, 1500)
    }
  })

  useSpeechRecognitionEvent("result", (event) => {
    const newTranscript = event.results[0]?.transcript || ""
    setTranscript(newTranscript)

    // Process the transcript
    if (newTranscript.trim()) {
      processSpeechInput(newTranscript, event.isFinal)
    }

    // Reset speech timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = setTimeout(() => {
        if (recognizing) handleStop()
      }, SPEECH_TIMEOUT)
    }
  })

  // Helper functions for speech processing
  const processSpeechInput = (text, isFinal) => {
    const lowerText = text.toLowerCase()
    
    // Check for "done" or "save task" commands
    if (isFinal && (
      lowerText.includes('done') || 
      lowerText.includes('save task') || 
      lowerText.includes('finish task') || 
      lowerText.includes('that\'s it')
    )) {
      handleStop()
      setTimeout(() => finishTask(), 500)
      return
    }
    
    // Check for field keywords
    let fieldDetected = false
    for (const [field, fieldKeywords] of Object.entries(keywords)) {
      if (containsAny(lowerText, fieldKeywords)) {
        const fieldName = field.toLowerCase()
        const content = extractContentAfterKeyword(text, lowerText, fieldKeywords)
        
        setCurrentField(fieldName)
        setCurrentAction(`Processing ${fieldName.replace('_', ' ')}...`)
        
        if (content && content.trim().length > 0) {
          updateTaskField(fieldName, content)
          setCurrentAction(`${fieldName.replace('_', ' ')} captured: "${content}"`)
        }
        fieldDetected = true
        break
      }
    }
    
    // If no keyword found, assume content is for current field
    if (!fieldDetected && text.trim()) {
      updateTaskField(currentField, text)
      setCurrentAction(`${currentField.replace('_', ' ')} updated: "${text}"`)
    }
  }

  // Helper function to update task data based on field
  const updateTaskField = (field, content) => {
    switch(field) {
      case "title":
        setTaskData(prev => ({ ...prev, title: content }))
        break
      case "description":
        setTaskData(prev => ({ ...prev, content: content }))
        break
      case "due_date":
        // Process date strings like "March 12" or "tomorrow"
        const processedDate = processDateString(content)
        setTaskData(prev => ({ ...prev, dueDate: processedDate }))
        break
      case "category":
        // Match against valid categories
        const matchedCategory = findClosestCategory(content, validCategories)
        setTaskData(prev => ({ ...prev, category: matchedCategory || "Tasks" }))
        break
      case "priority":
        // Match against valid priorities
        const matchedPriority = findClosestPriority(content, validPriorities)
        setTaskData(prev => ({ ...prev, priority: matchedPriority || "medium" }))
        break
    }
  }

  // Helper function to process date strings
  const processDateString = (dateText) => {
    const lowerDateText = dateText.toLowerCase().trim()
    
    // Handle relative dates
    if (lowerDateText.includes('today')) {
      return new Date().toISOString().split('T')[0]
    }
    if (lowerDateText.includes('tomorrow')) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    }
    if (lowerDateText.includes('next week')) {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      return nextWeek.toISOString().split('T')[0]
    }
    
    // Try to parse the date
    try {
      const parsedDate = new Date(dateText)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0]
      }
    } catch (e) {
      console.log("Error parsing date:", e)
    }
    
    // Return the original text if parsing fails
    return dateText
  }

  // Helper function to find the closest matching category
  const findClosestCategory = (input, categories) => {
    const lowerInput = input.toLowerCase().trim()
    
    // Direct match
    for (const category of categories) {
      if (lowerInput.includes(category.toLowerCase())) {
        return category
      }
    }
    
    // Return the first category as default
    return categories[0]
  }

  // Helper function to find the closest matching priority
  const findClosestPriority = (input, priorities) => {
    const lowerInput = input.toLowerCase().trim()
    
    // Direct match
    for (const priority of priorities) {
      if (lowerInput.includes(priority)) {
        return priority
      }
    }
    
    // Handle common expressions
    if (lowerInput.includes('urgent') || lowerInput.includes('important')) {
      return 'high'
    }
    if (lowerInput.includes('not urgent') || lowerInput.includes('can wait')) {
      return 'low'
    }
    
    // Default to medium
    return 'medium'
  }

  // Helper function to check if text contains any of the keywords
  const containsAny = (text, keywords) => {
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i')
      return regex.test(text)
    })
  }

  // Helper function to extract content after a keyword
  const extractContentAfterKeyword = (text, lowerText, keywords) => {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        const keywordIndex = lowerText.indexOf(keyword.toLowerCase())
        const content = text.substring(keywordIndex + keyword.length).trim()
        
        // Filter out common filler words
        if (content && !['is', 'the', 'a', 'an', 'this', 'that'].includes(content.toLowerCase())) {
          return content
        }
      }
    }
    return null
  }

  // Modified start speech recognition function
  const handleStart = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!result.granted) {
      console.warn("Permissions not granted", result)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setCurrentAction("Microphone permission denied")
      return
    }

    setCurrentAction("I'm listening... Say title, description, due date, or category")
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      maxAlternatives: 1,
      continuous: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
      // Improve recognition accuracy for task-related terminology
      contextualStrings: [
        "title", "description", "due date", "category", "priority",
        "task", "project", "deadline", "work", "personal",
        "high", "medium", "low", "notes", "meetings"
      ]
    })
  }

  // Modify finishTask function to include all captured data
  const finishTask = () => {
    setCurrentStep(1)
    setTranscript("")
    setCurrentAction("Task created successfully")
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    if (animationRef.current) setTimeout(() => animationRef.current.play(), 100)

    setTaskData((prev) => ({ ...prev, created: new Date().toISOString() }))
    setSaveCountdown(AUTO_SAVE_COUNTDOWN)
    setAutoSaving(true)
  }

  // Modify saveTaskAndNavigate function to include all captured data
  const saveTaskAndNavigate = () => {
    try {
      // Create the task data
      const now = new Date()
      
      // Define the priority color mapping
      const priorityColorMap = {
        high: "#DB2777",
        medium: "#4F46E5",
        low: "#059669"
      }
      
      // Use the captured category or default to "Tasks"
      const category = taskData.category || (taskData.priority === "high" ? "Important" : "Tasks")
      
      // Define the color based on priority
      const color = priorityColorMap[taskData.priority || "low"]
      
      // Create the note in Realm using the NoteService
      const noteId = noteService.createNote(
        taskData.title,        // title
        taskData.content || "", // content/description
        category,              // category
        color,                 // color
        false                  // isCompleted
      )
      
      // Create a simple object to pass via navigation params
      const noteData = {
        id: noteId,
        title: taskData.title,
        content: taskData.content || "",
        category: category,
        color: color,
        date: taskData.dueDate || now.toISOString().split("T")[0],
        dueDate: taskData.dueDate || null
      }
  
      // Handle navigation based on the params
      if (params.returnToTabs === "true") {
        router.replace({
          pathname: "/(tabs)",
          params: { newNote: JSON.stringify(noteData), timestamp: Date.now() },
        })
      } else {
        setTimeout(() => RNExitApp.exitApp(), 1000)
      }
  
      setCurrentAction("Task saved successfully")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error("Error preparing task data:", error)
      setCurrentAction("Error saving task")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  // Add a function to show help/tutorial
  const showTutorial = () => {
    Alert.alert(
      "Voice Task Creation",
      "You can use these voice commands:\n\n" +
      "• \"Title: Buy groceries\"\n" +
      "• \"Description: Milk, eggs, bread\"\n" +
      "• \"Due date: Tomorrow\"\n" +
      "• \"Category: Shopping\"\n" +
      "• \"Priority: High\"\n\n" +
      "Say \"Done\" or \"Save task\" when finished",
      [{ text: "Got it!" }]
    )
  }

  // Add a help button to the UI
  const HelpButton = () => (
    <TouchableOpacity 
      onPress={showTutorial}
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
      }}
    >
      <Text style={{ color: 'white', fontWeight: 'bold' }}>?</Text>
    </TouchableOpacity>
  )

  // Modify the TaskSummary component to display all captured data
  const TaskSummary = ({ theme, colors, taskData, autoSaving, saveCountdown }) => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", color: theme.text, marginBottom: 16 }}>
        {taskData.title}
      </Text>
      
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: theme.secondaryText, marginBottom: 4 }}>
          Description
        </Text>
        <Text style={{ fontSize: 16, color: theme.text }}>
          {taskData.content || "No description provided"}
        </Text>
      </View>
      
      {taskData.dueDate && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: theme.secondaryText, marginBottom: 4 }}>
            Due Date
          </Text>
          <Text style={{ fontSize: 16, color: theme.text }}>
            {taskData.dueDate}
          </Text>
        </View>
      )}
      
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: theme.secondaryText, marginBottom: 4 }}>
          Category
        </Text>
        <Text style={{ fontSize: 16, color: theme.text }}>
          {taskData.category || (taskData.priority === "high" ? "Important" : "Tasks")}
        </Text>
      </View>
      
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: theme.secondaryText, marginBottom: 4 }}>
          Priority
        </Text>
        <Text style={{ fontSize: 16, color: theme.text }}>
          {taskData.priority ? taskData.priority.charAt(0).toUpperCase() + taskData.priority.slice(1) : "Medium"}
        </Text>
      </View>
      
      {autoSaving && (
        <View style={{ 
          marginTop: 16,
          padding: 8,
          borderRadius: 8,
          backgroundColor: theme.autoSaveBg,
          borderWidth: 1,
          borderColor: theme.autoSaveBorder
        }}>
          <Text style={{ fontSize: 14, color: theme.text, textAlign: "center" }}>
            Auto-saving in {saveCountdown}...
          </Text>
        </View>
      )}
    </View>
  )

  // Keep the rest of your code, including the return statement
  // Just add the HelpButton component to your UI
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <HelpButton />

      <Header
        router={router}
        params={params}
        isDarkMode={isDarkMode}
        theme={theme}
        recognizing={recognizing}
        recordingTime={recordingTime}
        getStepLabel={getStepLabel}
        colors={colors}
      />

      {/* The rest of your UI remains the same */}
      {/* ... */}
    </SafeAreaView>
  )
}