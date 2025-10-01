import { useState, useEffect } from 'react'
import { OSMTag } from './OSMTag'

interface OSMTagsProps {
    tags: Record<string, any>
    onTagsChange?: (modifiedTags: Record<string, string>) => void
    className?: string
}

export function OSMTags({ tags, onTagsChange, className }: OSMTagsProps) {
    const [modifiedTags, setModifiedTags] = useState<Record<string, string>>({})

    if (!tags || Object.keys(tags).length === 0) {
        return null
    }

    const handleValueChange = (key: string, newValue: string) => {
        const originalValue = String(tags[key])

        setModifiedTags(prev => {
            const updated = { ...prev }

            if (newValue === originalValue) {
                // Value was reverted to original, remove from modified tags
                delete updated[key]
            } else {
                // Value was changed, add to modified tags
                updated[key] = newValue
            }

            return updated
        })
    }

    const handleResetAll = () => {
        setModifiedTags({})
    }

    // Notify parent component when tags change
    useEffect(() => {
        if (onTagsChange) {
            onTagsChange(modifiedTags)
        }
    }, [modifiedTags, onTagsChange])

    return (
        <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-medium text-gray-700">OSM Tags</h4>
                <div className="flex items-center space-x-2">
                    <span className={`text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded transition-opacity ${Object.keys(modifiedTags).length > 0 ? 'opacity-100' : 'opacity-0'
                        }`}>
                        {Object.keys(modifiedTags).length} modified
                    </span>
                    <button
                        onClick={handleResetAll}
                        className={`text-xs text-gray-600 hover:text-red-600 underline transition-opacity ${Object.keys(modifiedTags).length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                    >
                        Reset all
                    </button>
                </div>
            </div>
            <div className="space-y-1">
                {Object.entries(tags).map(([key, value]) => {
                    const currentValue = modifiedTags[key] !== undefined ? modifiedTags[key] : String(value)
                    const isModified = modifiedTags[key] !== undefined

                    return (
                        <OSMTag
                            key={key}
                            tagKey={key}
                            value={currentValue}
                            onValueChange={handleValueChange}
                            isModified={isModified}
                        />
                    )
                })}
            </div>
        </div>
    )
}