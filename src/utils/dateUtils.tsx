// Utility function to process date
export const processDate = (date) => {
    if (!date) return null
  
    const selectedDate = new Date(date)
    const today = new Date()
  
    // Clear time for date-only comparison
    today.setHours(0, 0, 0, 0)
    selectedDate.setHours(0, 0, 0, 0)
  
    const diff = Math.floor((selectedDate - today) / (1000 * 60 * 60 * 24))
  
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff === -1) return 'Yesterday'
  
    return selectedDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  
  // Utility function to process reminder
  export const processReminder = (reminder) => {
    if (!reminder) return null
  
    const now = new Date()
  
    if (reminder.startsWith('in ')) {
      const minutesMatch = reminder.match(/in (\d+) minutes/)
      if (minutesMatch) {
        const minutes = parseInt(minutesMatch[1])
        const futureTime = new Date(now.getTime() + minutes * 60000)
        return futureTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
      }
    }
  
    if (reminder.startsWith('at ')) {
      const timeMatch = reminder.match(/at (\d+):?(\d+)?\s*([ap]\.m\.)/i)
      if (timeMatch) {
        let hours = parseInt(timeMatch[1])
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
        const isPm = timeMatch[3].toLowerCase() === 'p.m.'
  
        if (isPm && hours < 12) hours += 12
        if (!isPm && hours === 12) hours = 0
  
        const reminderTime = new Date()
        reminderTime.setHours(hours, minutes, 0, 0)
  
        return reminderTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
      }
    }
  
    if (reminder.startsWith('on ')) {
      const dateMatch = reminder.match(/on (\d{4}-\d{2}-\d{2})/)
      if (dateMatch) {
        const reminderDate = new Date(dateMatch[1])
        return reminderDate.toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'})
      }
    }
  
    return reminder
  }
  