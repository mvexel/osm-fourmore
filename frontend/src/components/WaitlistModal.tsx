import { Modal } from './Modal'
import { UIIcons } from '../utils/icons'

interface WaitlistModalProps {
  message: string
  email: string
  onClose: () => void
}

export function WaitlistModal({ message, email, onClose }: WaitlistModalProps) {
  return (
    <Modal>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Private Beta</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            aria-label="Close waitlist message"
          >
            {UIIcons.close({ size: 20 })}
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full">
              {UIIcons.idea({ size: 32, className: 'text-primary-600' })}
            </div>
          </div>
          <p className="text-gray-700 text-center">{message}</p>
          <div className="flex justify-center">
            <a
              href={`mailto:${email}?subject=FourMore%20Beta%20Access%20Request`}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
            >
              Email Martijn
            </a>
          </div>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
