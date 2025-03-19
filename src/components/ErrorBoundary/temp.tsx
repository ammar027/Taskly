const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const NoteCard = memo(({item, index, onDelete, onUpdateCategory, onToggleCompletion, theme, isLandscape}) => {
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  
  // Check if the due date is overdue
  const isOverdue = useMemo(() => {
    if (!item.dueDate) return false;
    return new Date(item.dueDate) < new Date();
  }, [item.dueDate]);

  const handlePress = useCallback(() => {
    console.log('Navigating to note with ID:', item.id);
    router.push({
      pathname: '/record/[id]',
      params: {id: item.id}
    });
  }, [item.id]);

  const handleCategorySelect = useCallback(() => {
    setCategoryModalVisible(true);
  }, []);

  const handleUpdateCategory = useCallback(
    category => {
      if (onUpdateCategory) {
        onUpdateCategory(item.id, category);
      }
    },
    [item.id, onUpdateCategory]
  );

  const handleToggleCompletion = useCallback(() => {
    if (onToggleCompletion) {
      onToggleCompletion(item.id, !item.isCompleted);
    }
  }, [item.id, item.isCompleted, onToggleCompletion]);

  // Get priority color with alpha
  const getPriorityColor = (priority, alpha = 1) => {
    const colors = {
      high: `rgba(239, 68, 68, ${alpha})`,
      medium: `rgba(245, 158, 11, ${alpha})`,
      low: `rgba(16, 185, 129, ${alpha})`
    };
    return colors[priority] || colors.medium;
  };

  return (
    <>
      <AnimatedPressable
        onPress={handlePress}
        style={[
          styles.noteCard,
          {
            backgroundColor: theme.isDarkMode ? '#1E1E1E' : '#FFFFFF',
            borderColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            width: isLandscape ? '48%' : '100%',
            borderLeftWidth: 4,
            borderLeftColor: item.isCompleted ? '#9CA3AF' : item.color
          }
        ]}
        entering={FadeInUp.delay(index * 100)}
        exiting={FadeOutDown}
      >
        {/* Card content with opacity based on completion status */}
        <View style={{opacity: item.isCompleted ? 0.7 : 1}}>
          {/* Priority indicator */}
          {item.priority && (
            <View style={[styles.priorityIndicator, {backgroundColor: getPriorityColor(item.priority, 0.15)}]}>
              <Text style={[styles.priorityText, {color: getPriorityColor(item.priority)}]}>
                {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
              </Text>
            </View>
          )}

          <View style={styles.noteHeader}>
            <View style={styles.titleContainer}>
              <Pressable 
                style={styles.checkboxContainer} 
                onPress={handleToggleCompletion} 
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: item.isCompleted ? '#9CA3AF' : item.color,
                      backgroundColor: item.isCompleted ? '#9CA3AF' : 'transparent'
                    }
                  ]}
                >
                  {item.isCompleted && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </Pressable>
              <Text
                style={[
                  styles.noteTitle,
                  {
                    color: theme.textColor,
                    textDecorationLine: item.isCompleted ? 'line-through' : 'none'
                  }
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </View>
            <Pressable onPress={handleCategorySelect}>
              <Text
                style={[
                  styles.noteCategory,
                  {
                    backgroundColor: `${item.color}${theme.isDarkMode ? '30' : '15'}`,
                    color: item.color
                  }
                ]}
              >
                {item.category}
              </Text>
            </Pressable>
          </View>

          <Text
            style={[
              styles.noteContent,
              {
                color: theme.subTextColor,
                textDecorationLine: item.isCompleted ? 'line-through' : 'none'
              }
            ]}
            numberOfLines={2}
          >
            {item.content}
          </Text>

          <View style={styles.divider} />

          <View style={styles.noteFooter}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color={theme.mutedTextColor} />
              <Text style={[styles.noteDate, {color: theme.mutedTextColor}]}>
                {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </View>
            
            {item.dueDate && (
              <View style={[styles.dueDate, isOverdue && !item.isCompleted && styles.overdueDate]}>
                <Ionicons 
                  name={isOverdue && !item.isCompleted ? "alarm" : "time-outline"} 
                  size={14} 
                  color={isOverdue && !item.isCompleted ? "#ef4444" : theme.mutedTextColor} 
                />
                <Text 
                  style={[
                    styles.dueDateText, 
                    {color: isOverdue && !item.isCompleted ? "#ef4444" : theme.mutedTextColor}
                  ]}
                >
                  Due: {new Date(item.dueDate).toLocaleDateString()}
                </Text>
              </View>
            )}
            
            <View style={styles.actionIcons}>
              <Pressable 
                style={styles.iconButton} 
                onPress={handleCategorySelect}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              >
                <Ionicons name="folder-outline" size={18} color={theme.isDarkMode ? '#9ca3af' : '#6B7280'} />
              </Pressable>
              <Pressable 
                style={styles.iconButton} 
                onPress={() => setAlertVisible(true)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        </View>
      </AnimatedPressable>

      <CategorySelectionModal 
        visible={categoryModalVisible} 
        onClose={() => setCategoryModalVisible(false)} 
        onSelectCategory={handleUpdateCategory} 
        currentCategory={item.category} 
        theme={theme} 
      />
      <CustomAlert
        visible={alertVisible}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        onCancel={() => setAlertVisible(false)}
        onDelete={() => {
          onDelete(item.id);
          setAlertVisible(false);
        }}
        theme={theme}
      />
    </>
  );
});

const styles = StyleSheet.create({
  noteCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 0,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  noteCategory: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noteContent: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 10,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overdueDate: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priorityIndicator: {
    position: 'absolute',
    top: -8,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    zIndex: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 'auto',
  },
  iconButton: {
    padding: 4,
  },
  checkboxContainer: {
    marginRight: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});