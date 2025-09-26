import React from 'react'
import { useDoubleConfirm } from '../hooks/useDoubleConfirm'

interface DoubleConfirmButtonProps {
    /** The action to perform on double confirmation */
    onConfirm: () => Promise<void>
    /** Button text in normal state */
    children: React.ReactNode
    /** Button text when in pending confirmation state */
    confirmText?: string
    /** Button text when executing */
    executingText?: string
    /** CSS classes for normal state */
    className?: string
    /** CSS classes for warning/confirm state */
    warningClassName?: string
    /** Additional props passed to button */
    buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
    /** Time before reset in ms (default: 3000) */
    resetTimeout?: number
}

/**
 * A button component that implements double-confirm pattern.
 * First click shows warning state, second click executes the action.
 */
export function DoubleConfirmButton({
    onConfirm,
    children,
    confirmText = 'Are you sure?',
    executingText = 'Processing...',
    className = 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700',
    warningClassName = 'px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700',
    buttonProps = {},
    resetTimeout = 3000
}: DoubleConfirmButtonProps) {
    const { isPending, isExecuting, handleAction } = useDoubleConfirm({ resetTimeout })

    const handleClick = () => {
        handleAction(onConfirm).catch(err => {
            console.error('Action failed:', err)
        })
    }

    return (
        <button
            {...buttonProps}
            onClick={handleClick}
            disabled={isExecuting || buttonProps.disabled}
            className={`${isPending ? warningClassName : className} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        >
            {isExecuting
                ? executingText
                : isPending
                    ? confirmText
                    : children
            }
        </button>
    )
}