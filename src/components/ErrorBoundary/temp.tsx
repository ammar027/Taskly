// First, extract these from the component body to prevent recreating on each render
const timingOptions = [5, 15, 30, 60]
const priorities = ["low", "medium", "high"]

const ModalContent = React.memo(({ 
  colors,
  title,
  setTitle,
  selectedDate,
  setSelectedDate,
  showDatePicker,
  setShowDatePicker,
  datePickerMode,
  setDatePickerMode,
  priority,
  setPriority,
  category,
  setCategory,
  reminderTime,
  setReminderTime,
  editMode,
  currentReminder,
  isDarkMode,
  onSave,
  onDelete,
  onClose
}) => {
  const showDatePickerModal = useCallback((mode) => {
    setDatePickerMode(mode)
    setShowDatePicker(true)
  }, [setDatePickerMode, setShowDatePicker])

  const onChangeDate = useCallback((event, selected) => {
    if (selected) {
      const currentDateTime = new Date(selectedDate)
      
      if (datePickerMode === "date") {
        currentDateTime.setFullYear(selected.getFullYear())
        currentDateTime.setMonth(selected.getMonth())
        currentDateTime.setDate(selected.getDate())
      } else {
        currentDateTime.setHours(selected.getHours())
        currentDateTime.setMinutes(selected.getMinutes())
      }
      
      setSelectedDate(currentDateTime)
    }
    
    if (Platform.OS === "android") setShowDatePicker(false)
  }, [selectedDate, datePickerMode, setSelectedDate, setShowDatePicker])

  const getPriorityColors = useCallback((priorityValue) => {
    const priorities = {
      low: { light: "#059669", dark: "#34D399" },
      medium: { light: "#D97706", dark: "#FBBF24" },
      high: { light: "#DC2626", dark: "#F87171" }
    };
    return isDarkMode ? priorities[priorityValue].dark : priorities[priorityValue].light;
  }, [isDarkMode])

  return (
    <View style={[styles.modalContent, { 
      backgroundColor: colors.modalOverlay,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24
    }]}>
      <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>
          {editMode ? "Edit Reminder" : "New Reminder"}
        </Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.subText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.formScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
        bounces={false}
      >
        <View style={styles.form}>
          {/* Title Input */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Title</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.input,
                borderColor: colors.inputBorder,
                color: colors.text
              }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter reminder title"
              placeholderTextColor={colors.subText}
              autoFocus={!editMode}
              returnKeyType="done"
            />
          </View>

          {/* Date & Time */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Date & Time</Text>
            <View style={styles.dateTimeButtons}>
              <TouchableOpacity 
                style={[styles.dateButton, { 
                  backgroundColor: colors.accentLight, 
                  borderColor: colors.accentBorder 
                }]} 
                onPress={() => showDatePickerModal("date")}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                <Text style={[styles.dateButtonText, { color: colors.accent }]}>
                  {format(selectedDate, "EEE, MMM d, yyyy")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.dateButton, { 
                  backgroundColor: colors.accentLight, 
                  borderColor: colors.accentBorder 
                }]} 
                onPress={() => showDatePickerModal("time")}
              >
                <Ionicons name="time-outline" size={20} color={colors.accent} />
                <Text style={[styles.dateButtonText, { color: colors.accent }]}>
                  {format(selectedDate, "h:mm a")}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <View style={[styles.datePickerContainer, { 
                backgroundColor: isDarkMode ? "#374151" : "#f8fafc" 
              }]}>
                <DateTimePicker
                  testID="dateTimePicker"
                  value={selectedDate}
                  mode={datePickerMode}
                  is24Hour={false}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onChangeDate}
                  style={styles.datePicker}
                  textColor={isDarkMode ? "#f9fafb" : undefined}
                  themeVariant={isDarkMode ? "dark" : "light"}
                />
                {Platform.OS === "ios" && (
                  <View style={[styles.datePickerButtons, { 
                    backgroundColor: isDarkMode ? "#1f2937" : "#f1f5f9" 
                  }]}>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={[styles.datePickerButtonText, { color: colors.accent }]}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Reminder Timing */}
          <View style={styles.notificationTimingSelector}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Remind me before:</Text>
            <View style={styles.timingButtons}>
              {timingOptions.map(minutes => (
                <TouchableOpacity
                  key={minutes}
                  style={[styles.timingButton, {
                    backgroundColor: reminderTime === minutes ? `${colors.accent}20` : "transparent",
                    borderColor: colors.accent,
                    borderWidth: reminderTime === minutes ? 2 : 1,
                  }]}
                  onPress={() => setReminderTime(minutes)}
                >
                  <Text style={[styles.timingButtonText, { 
                    fontWeight: reminderTime === minutes ? "700" : "500",
                    color: colors.text
                  }]}>
                    {minutes} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority Selection */}
          <View style={styles.prioritySelector}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Priority:</Text>
            <View style={styles.priorityButtons}>
              {priorities.map(p => {
                const buttonColor = getPriorityColors(p);
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityButton, { 
                      backgroundColor: priority === p ? buttonColor : "transparent",
                      borderColor: buttonColor 
                    }]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.priorityButtonText, { 
                      color: priority === p ? (isDarkMode ? "#000000" : "#ffffff") : buttonColor 
                    }]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)} {PRIORITY_EMOJIS[p]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Category Selection */}
          <View style={styles.categorySelector}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Category:</Text>
            <View style={styles.categoryButtons}>
              {CATEGORIES.map(cat => {
                const catColor = isDarkMode ? cat.darkColor : cat.color;
                return (
                  <TouchableOpacity
                    key={cat.name}
                    style={[styles.categoryButton, {
                      backgroundColor: category === cat.name ? `${catColor}20` : "transparent",
                      borderColor: catColor,
                      borderWidth: category === cat.name ? 2 : 1,
                    }]}
                    onPress={() => setCategory(cat.name)}
                  >
                    <Ionicons 
                      name={cat.icon} 
                      size={16} 
                      color={catColor} 
                      style={styles.categoryIcon} 
                    />
                    <Text style={[styles.categoryButtonText, { color: catColor }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: colors.accent }]} 
            onPress={onSave}
          >
            <Text style={styles.saveButtonText}>
              {editMode ? "Update Reminder" : "Add Reminder"}
            </Text>
          </TouchableOpacity>

          {editMode && (
            <TouchableOpacity
              style={[styles.deleteButton, {
                borderColor: colors.deleteBorder,
                backgroundColor: colors.deleteBackground
              }]}
              onPress={() => {
                onClose()
                setTimeout(() => onDelete(currentReminder.id), 300)
              }}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={colors.deleteText}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.deleteButtonText, { color: colors.deleteText }]}>
                Delete Reminder
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.bottomPadding} />
        </View>
      </ScrollView>
    </View>
  )
})

// Updated styles
const styles = StyleSheet.create({
  // ... (keep existing styles)
  
  scrollContent: {
    flexGrow: 1,
  },
  
  modalContent: {
    maxHeight: '90%',
  },
  
  formScrollView: {
    flex: 1,
  },
})