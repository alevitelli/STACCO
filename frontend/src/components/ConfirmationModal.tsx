'use client'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  message: string
}

export default function ConfirmationModal({ isOpen, onClose, onConfirm, message }: ConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 relative">
        <h2 className="text-2xl font-raleway text-center mb-8">
          Conferma
        </h2>
        <p className="text-center mb-8">{message}</p>
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 p-3 rounded-xl hover:bg-gray-300"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className="bg-blue-500 text-white p-3 rounded-xl hover:bg-black"
          >
            Conferma
          </button>
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  )
}