import { useState, useCallback, useRef } from 'react'

interface UseDoubleConfirmOptions {
    /** Time in milliseconds before the confirm state resets (default: 3000ms) */
    resetTimeout?: number
}

interface UseDoubleConfirmReturn {
    /** Whether the action is in pending confirmation state */
    isPending: boolean
    /** Whether the action is currently executing */
    isExecuting: boolean
    /** Handler that manages the double-confirm flow */
    handleAction: (action: () => Promise<void>) => Promise<void>
    /** Reset the pending state manually */
    reset: () => void
}

/**
 * Hook for implementing double-confirm pattern for dangerous actions.
 * First click shows warning state, second click executes the action.
 */
export function useDoubleConfirm(options: UseDoubleConfirmOptions = {}): UseDoubleConfirmReturn {
    const { resetTimeout = 3000 } = options
    const [isPending, setIsPending] = useState(false)
    const [isExecuting, setIsExecuting] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const reset = useCallback(() => {
        setIsPending(false)
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }, [])

    const handleAction = useCallback(async (action: () => Promise<void>) => {
        if (!isPending) {
            // First click - show warning
            setIsPending(true)
            timeoutRef.current = setTimeout(reset, resetTimeout)
            return
        }

        // Second click - execute action
        setIsExecuting(true)
        reset()

        try {
            await action()
        } finally {
            setIsExecuting(false)
        }
    }, [isPending, reset, resetTimeout])

    return {
        isPending,
        isExecuting,
        handleAction,
        reset
    }
}