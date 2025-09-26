import { useState } from 'react'
import { osmApi } from '../services/api'
import { IconCheck, IconMessagePlus } from '@tabler/icons-react'
import { useDoubleConfirm } from '../hooks/useDoubleConfirm'

interface OSMContributionProps {
  poiId: number
  className?: string
}

export function OSMContribution({ poiId, className }: OSMContributionProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteAdded, setNoteAdded] = useState(false)
  const [noteMessage, setNoteMessage] = useState<string | null>(null)

  const confirmAction = useDoubleConfirm()
  const noteAction = useDoubleConfirm()

  const performConfirmInfo = async () => {
    const result = await osmApi.confirmInfo(poiId)
    setConfirmed(true)
    setConfirmMessage(result.message)
  }

  const handleConfirmInfo = () => {
    confirmAction.handleAction(performConfirmInfo).catch(err => {
      console.error('Error confirming info:', err)
      alert('Failed to confirm info. Please try again.')
    })
  }

  const performAddNote = async () => {
    if (!note.trim()) {
      alert('Please enter a note.')
      return
    }
    const result = await osmApi.createNote(poiId, note)
    setNoteAdded(true)
    setNoteMessage(result.message)
    setNote('')
  }

  const handleAddNote = () => {
    noteAction.handleAction(performAddNote).catch(err => {
      console.error('Error adding note:', err)
      alert('Failed to add note. Please try again.')
    })
  }

  return (
    <div className={`p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
      <div className="flex items-center space-x-2 mb-3 justify-center">
        <h3 className="font-medium text-green-900">You can help keep OSM up to date!</h3>
      </div>

      {confirmed ? (
        <div className="flex items-center gap-2 p-3 bg-green-100 rounded-md">
          <IconCheck size={20} className="text-green-600" />
          <span className="text-sm text-green-800">{confirmMessage}</span>
        </div>
      ) : (
        <button
          onClick={handleConfirmInfo}
          disabled={confirmAction.isExecuting}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmAction.isPending
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
            }`}
        >
          <IconCheck size={20} />
          {confirmAction.isExecuting
            ? 'Confirming...'
            : confirmAction.isPending
              ? 'Are you sure?'
              : 'Confirm Info is Correct'
          }
        </button>

      )}
      <p className="text-xs text-gray-500 text-center pt-4">By confirming, FourMore will add a <code>check_date</code> to the feature in OSM. This indicates to other mappers that the information has been reviewed, even if no changes were made.</p>

      <div className="mt-4 pt-4 border-t border-green-200">
        <h4 className="font-medium text-green-800 mb-2">Add a note</h4>
        <p className="text-xs text-gray-500 mb-2">
          If you see something wrong or missing, you can add a note to OSM. This will be visible to other mappers who can then fix the issue.
        </p>
        {noteAdded ? (
          <div className="flex items-center gap-2 p-3 bg-blue-100 rounded-md">
            <IconCheck size={20} className="text-blue-600" />
            <span className="text-sm text-blue-800">{noteMessage}</span>
          </div>
        ) : (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., The business has moved, this is a duplicate, opening hours are wrong."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              maxLength={1000}
            />
            <button
              onClick={handleAddNote}
              disabled={noteAction.isExecuting}
              className={`w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${noteAction.isPending
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              <IconMessagePlus size={20} />
              {noteAction.isExecuting
                ? 'Adding Note...'
                : noteAction.isPending
                  ? 'Are you sure?'
                  : 'Add Note'
              }
            </button>
          </>
        )}
      </div>
    </div>
  )
}
