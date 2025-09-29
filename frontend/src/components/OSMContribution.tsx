import { useState } from 'react'
import { osmApi } from '../services/api'
import { IconCheck, IconMessagePlus, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useDoubleConfirm } from '../hooks/useDoubleConfirm'
import { OSMTags } from './OSMTags'

interface OSMContributionProps {
  osmType: string
  osmId: number
  tags?: Record<string, any>
  isExpanded?: boolean
  onToggleExpanded?: (expanded: boolean) => void
  className?: string
}

export function OSMContribution({
  osmType,
  osmId,
  tags,
  isExpanded = false,
  onToggleExpanded,
  className
}: OSMContributionProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteAdded, setNoteAdded] = useState(false)
  const [noteMessage, setNoteMessage] = useState<string | null>(null)
  const [internalExpanded, setInternalExpanded] = useState(isExpanded)
  const [modifiedTags, setModifiedTags] = useState<Record<string, string>>({})

  const confirmAction = useDoubleConfirm()
  const noteAction = useDoubleConfirm()

  // Use internal state if no external control is provided
  const expanded = onToggleExpanded ? isExpanded : internalExpanded
  const toggleExpanded = onToggleExpanded || ((exp: boolean) => setInternalExpanded(exp))

  // Check if there are any modified tags
  const hasModifiedTags = Object.keys(modifiedTags).length > 0

  const performConfirmInfo = async () => {
    if (hasModifiedTags) {
      // TODO: Implement tag update functionality with osmApi
      // For now, just show a placeholder message
      setConfirmed(true)
      setConfirmMessage(`Tags updated! Modified ${Object.keys(modifiedTags).length} tag(s).`)
    } else {
      const result = await osmApi.confirmInfo(osmType, osmId)
      setConfirmed(true)
      setConfirmMessage(result.message)
    }
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
    const result = await osmApi.createNote(osmType, osmId, note)
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
    <div className={`border border-green-200 rounded-lg ${className}`}>
      {/* Collapsible Header */}
      <button
        onClick={() => toggleExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-4 rounded-t-lg hover:bg-green-100 transition-colors ${hasModifiedTags
            ? 'bg-yellow-50' + (expanded ? ' border-b border-yellow-200' : '')
            : 'bg-green-50' + (expanded ? ' border-b border-green-200' : '')
          }`}
      >
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-green-900">Help keep OSM up to date!</h3>
          {hasModifiedTags && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              {Object.keys(modifiedTags).length} modified
            </span>
          )}
        </div>
        <span className="text-green-700">
          {expanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* OSM Tags */}
          {tags && <OSMTags tags={tags} onTagsChange={setModifiedTags} className="mb-4" />}

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
                : hasModifiedTags
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              <IconCheck size={20} />
              {confirmAction.isExecuting
                ? hasModifiedTags ? 'Updating...' : 'Confirming...'
                : confirmAction.isPending
                  ? 'Are you sure?'
                  : hasModifiedTags
                    ? 'Update the Map'
                    : 'Confirm Info is Correct'
              }
            </button>

          )}
          <p className="text-xs text-gray-500 text-center">
            {hasModifiedTags
              ? 'By updating, FourMore will submit your tag changes to OpenStreetMap.'
              : 'By confirming, FourMore will add a check_date to the feature in OSM. This indicates to other mappers that the information has been reviewed, even if no changes were made.'
            }
          </p>

          <div className="pt-4 border-t border-green-200">
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
      )}
    </div>
  )
}
