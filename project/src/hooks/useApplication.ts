import { useState } from 'react'
import { applyToVacancy, ApplyRequest, ApplyResponse } from '../lib/publicApi'

interface UseApplicationReturn {
  submitApplication: (vacancyId: string, formData: any) => Promise<ApplyResponse>
  loading: boolean
  error: string
}

export function useApplication(): UseApplicationReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submitApplication = async (vacancyId: string, formData: any): Promise<ApplyResponse> => {
    try {
      setLoading(true)
      setError('')

      const request: ApplyRequest = {
        vacancy_id: vacancyId,
        candidate: {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone
        },
        files: formData.files || []
      }

      const result = await applyToVacancy(request)
      return result
    } catch (err: any) {
      const errorMessage = err.message || 'Error al enviar la aplicación'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return {
    submitApplication,
    loading,
    error
  }
}