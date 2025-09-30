import { useState } from 'react'
import { osmApi } from '../services/api'
import { IconCheck, IconMessagePlus, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useDoubleConfirm } from '../hooks/useDoubleConfirm'

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
  const [note, setNote] = useState('')
  const [noteAdded, setNoteAdded] = useState(false)
  const [noteMessage, setNoteMessage] = useState<string | null>(null)
  const [internalExpanded, setInternalExpanded] = useState(isExpanded)

  const noteAction = useDoubleConfirm()

  // Use internal state if no external control is provided
  const expanded = onToggleExpanded ? isExpanded : internalExpanded
  const toggleExpanded = onToggleExpanded || ((exp: boolean) => setInternalExpanded(exp))

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
    <div className={`border border-blue-200 rounded-lg ${className}`}>
      {/* Collapsible Header */}
      <button
        onClick={() => toggleExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-4 rounded-t-lg bg-blue-50 hover:bg-blue-100 transition-colors ${
          expanded ? 'border-b border-blue-200' : ''
        }`}
      >
        <h3 className="font-medium text-blue-900">See something wrong?</h3>
        <span className="text-blue-700">
          {expanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
        </span>
      </button>

      {expanded && (
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-3">
            If you notice something wrong or missing, you can add a note to OpenStreetMap. Other mappers will be able to see your note and fix the issue.
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                maxLength={1000}
              />
              <button
                onClick={handleAddNote}
                disabled={noteAction.isExecuting}
                className={`w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  noteAction.isPending
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
      )}
    </div>
  )
}
