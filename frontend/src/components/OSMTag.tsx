import { useState } from 'react'

interface OSMTagProps {
    tagKey: string
    value: string
    onValueChange: (key: string, newValue: string) => void
    isModified: boolean
}

export function OSMTag({ tagKey, value, onValueChange, isModified }: OSMTagProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(value)

    // Check if this is a boolean tag (yes/no)
    const isBooleanTag = value === 'yes' || value === 'no'

    const handleSave = () => {
        onValueChange(tagKey, editValue)
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditValue(value)
        setIsEditing(false)
    }

    const toggleBoolean = () => {
        const newValue = value === 'yes' ? 'no' : 'yes'
        onValueChange(tagKey, newValue)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            handleCancel()
        }
    }

    return (
        <div className={`flex items-center p-3 rounded border ${isModified
            ? 'bg-yellow-50 border-yellow-300'
            : 'bg-white border-gray-200'
            }`}>
            {/* Tag Key - Fixed width for alignment */}
            <div className="w-32 flex-shrink-0">
                <span className="font-mono text-xs font-medium text-gray-800">
                    {tagKey}
                </span>
            </div>

            {/* Equals sign */}
            <span className="text-gray-500 text-xs mx-2">=</span>

            {/* Tag Value - Takes remaining space */}
            <div className="flex-1 flex items-center min-w-0">
                {isBooleanTag ? (
                    <button
                        onClick={toggleBoolean}
                        className={`px-3 py-1 text-xs rounded font-mono transition-colors ${value === 'yes'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                    >
                        {value}
                    </button>
                ) : isEditing ? (
                    <div className="flex items-center space-x-1 w-full">
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
                            autoFocus
                        />
                        <button
                            onClick={handleSave}
                            className="w-6 h-6 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex-shrink-0 flex items-center justify-center"
                        >
                            ✓
                        </button>
                        <button
                            onClick={handleCancel}
                            className="w-6 h-6 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 flex-shrink-0 flex items-center justify-center"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="font-mono text-xs text-gray-700 hover:text-primary-600 hover:underline text-left w-full"
                    >
                        {value}
                    </button>
                )}
            </div>

            {/* Modified indicator */}
            {isModified && (
                <div className="ml-3 w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" title="Modified" />
            )}
        </div>
    )
}