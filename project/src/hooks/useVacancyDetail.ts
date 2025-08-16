import { useState, useEffect } from 'react'
import { getPublicVacancy, PublicVacancyDetail } from '../lib/publicApi'

interface UseVacancyDetailReturn {
  vacancy: PublicVacancyDetail | null
  loading: boolean
  error: string
}

export function useVacancyDetail(vacancyId: string): UseVacancyDetailReturn {
  const [vacancy, setVacancy] = useState<PublicVacancyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadVacancy = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await getPublicVacancy(vacancyId)
        setVacancy(data)
      } catch (err: any) {
        setError(err.message || 'Error al cargar la vacante')
        setVacancy(null)
      } finally {
        setLoading(false)
      }
    }

    if (vacancyId) {
      loadVacancy()
    }
  }, [vacancyId])

  return {
    vacancy,
    loading,
    error
  }
}