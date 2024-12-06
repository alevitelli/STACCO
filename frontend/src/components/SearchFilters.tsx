interface SearchFiltersProps {
  onSearchChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onCinemaChange: (value: string) => void;
  availableCinemas: string[];
  selectedCinema: string;
  selectedLanguage: string;
  placeholderText?: string;
  filterLabel?: string;
}

export default function SearchFilters({ 
  onSearchChange, 
  onLanguageChange, 
  onCinemaChange,
  availableCinemas,
  selectedCinema,
  selectedLanguage,
  placeholderText = "Cerca film...",
  filterLabel = "Cinema"
}: SearchFiltersProps) {
  return (
    <div className="max-w-4xl mx-auto bg-gray-50/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-sm border border-black/5 shadow-sm">
      <div className="space-y-3 sm:space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder={placeholderText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-white
                     font-raleway text-sm sm:text-base placeholder:text-gray-400
                     rounded-lg sm:rounded-xl border border-black/5
                     focus:outline-none focus:ring-2 focus:ring-[#0D0C22]/10
                     transition-all duration-200 shadow-sm"
          />
          <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {selectedLanguage !== undefined && (
            <select
              onChange={(e) => onLanguageChange(e.target.value)}
              value={selectedLanguage}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-white
                       font-raleway text-sm sm:text-base
                       rounded-lg sm:rounded-xl border border-black/5
                       focus:outline-none focus:ring-2 focus:ring-[#0D0C22]/10
                       transition-all duration-200 shadow-sm
                       appearance-none
                       min-w-[140px] sm:min-w-[180px]
                       cursor-pointer"
            >
              <option value="">Tutte le lingue</option>
              <option value="Original">Versione Originale</option>
              <option value="Italiano">Italiano</option>
            </select>
          )}

          <select
            onChange={(e) => onCinemaChange(e.target.value)}
            value={selectedCinema}
            className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-white
                     font-raleway text-sm sm:text-base
                     rounded-lg sm:rounded-xl border border-black/5
                     focus:outline-none focus:ring-2 focus:ring-[#0D0C22]/10
                     transition-all duration-200 shadow-sm
                     appearance-none
                     min-w-[140px] sm:min-w-[180px]
                     cursor-pointer"
          >
            <option value="">Tutti {filterLabel}</option>
            {availableCinemas.map(cinema => (
              <option key={cinema} value={cinema}>
                {cinema}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
} 