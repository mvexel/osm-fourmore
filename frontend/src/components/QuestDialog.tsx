import { useState, useEffect } from 'react'
import { IconX, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { Quest } from '../types'
import { questsApi } from '../services/api'

interface QuestDialogProps {
  osmType: string
  osmId: number
  quests: Quest[]
  onClose: () => void
  onComplete: () => void
}

export function QuestDialog({ osmType, osmId, quests, onClose, onComplete }: QuestDialogProps) {
  const [currentQuestIndex, setCurrentQuestIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  const currentQuest = quests[currentQuestIndex]
  const progress = `${currentQuestIndex + 1} of ${quests.length}`

  const handleAnswer = async (answer: 'yes' | 'no') => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await questsApi.respond({
        poi_osm_type: osmType,
        poi_osm_id: osmId,
        quest_id: currentQuest.id,
        answer,
      })

      if (!result.success) {
        setError(result.message)
        setIsSubmitting(false)
        return
      }

      // Move to next quest or complete
      if (currentQuestIndex < quests.length - 1) {
        setCurrentQuestIndex(currentQuestIndex + 1)
      } else {
        setCompleted(true)
        setTimeout(() => {
          onComplete()
          onClose()
        }, 2000)
      }
    } catch (err) {
      console.error('Error submitting quest response:', err)
      setError('Failed to submit answer. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (completed) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <IconCheck size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Thank you for contributing!
            </h2>
            <p className="text-gray-600">
              Your answers have been submitted to OpenStreetMap.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Help improve the map</h2>
            <p className="text-sm text-gray-500">Quest {progress}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Quest Content */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              {currentQuest.question}
            </h3>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                <IconAlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-sm text-red-600 underline mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Answer Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleAnswer('yes')}
              disabled={isSubmitting}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Yes'}
            </button>
            <button
              onClick={() => handleAnswer('no')}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'No'}
            </button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center">
            Your answer will be submitted to OpenStreetMap
          </p>
        </div>
      </div>
    </div>
  )
}
