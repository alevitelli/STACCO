interface DatePickerProps {
    onDateChange: (date: string) => void;
    initialDate?: string;
  }
  
  export default function DatePicker({ onDateChange, initialDate }: DatePickerProps) {
    const today = new Date()
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      return date
    })
  
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-0">
        <div className="flex justify-start sm:justify-center space-x-1.5 sm:space-x-2 overflow-x-auto py-1 sm:py-2 scrollbar-hide">
          {dates.map((date, i) => {
            const dateString = date.toISOString().split('T')[0]
            const isSelected = dateString === initialDate
            
            return (
              <button
                key={i}
                onClick={() => onDateChange(dateString)}
                className={`
                  flex-none px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl
                  font-raleway text-xs sm:text-sm
                  transition-all duration-200 ease-in-out
                  ${isSelected 
                    ? 'bg-[#0D0C22] text-white shadow-lg transform scale-105' 
                    : 'bg-white hover:bg-gray-50 text-gray-900 border border-black/5 hover:border-black/10 hover:shadow-md'
                  }
                `}
              >
                <div className="font-medium">
                  {i === 0 ? 'OGGI' : date.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase()}
                </div>
                <div className="mt-0.5 sm:mt-1 text-lg sm:text-xl font-light">
                  {date.toLocaleDateString('it-IT', { day: 'numeric' })}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }