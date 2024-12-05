export const isTimeAfter = (showtime: string | undefined, selectedTime: string | undefined): boolean => {
    // If no selected time, show all times
    if (!selectedTime) return true
    
    // If no showtime, don't show it
    if (!showtime) return false
  
    try {
      const [showHour, showMinute] = showtime.split(':').map(Number)
      const [selectedHour, selectedMinute] = selectedTime.split(':').map(Number)
      
      // Validate the parsed numbers
      if (isNaN(showHour) || isNaN(showMinute) || 
          isNaN(selectedHour) || isNaN(selectedMinute)) {
        return false
      }
      
      if (showHour > selectedHour) return true
      if (showHour === selectedHour && showMinute >= selectedMinute) return true
      return false
    } catch (error) {
      console.error('Error parsing time:', error)
      return false
    }
  }