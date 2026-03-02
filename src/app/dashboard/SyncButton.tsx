'use client'

import { useState } from 'react'

export function SyncButton() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const handleSync = async () => {
        setLoading(true)
        setMessage(null)

        try {
            const response = await fetch('/api/repositories/sync', {
                method: 'POST',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Erro ao sincronizar')
            }

            setMessage('Repositórios sincronizados com sucesso!')
            setTimeout(() => {
                window.location.reload()
            }, 1500)
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Erro ao sincronizar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-end gap-2">
            <button
                onClick={handleSync}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? 'Sincronizando...' : 'Sincronizar Repositórios'}
            </button>
            {message && (
                <p className={`text-sm ${message.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
                    {message}
                </p>
            )}
        </div>
    )
}

