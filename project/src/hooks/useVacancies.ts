import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { listPublicVacancies, PublicVacancy, VacanciesResponse } from '../lib/publicApi'

interface UseVacanciesReturn {
  vacancies: VacanciesResponse | null
  loading: boolean
  error: string
  filters: {
    type: string
    sort: string
  }
  handleFilterChange: (newFilters: { type: string; sort: string }) => void
  handleViewDetails: (id: string) => void
}

export function useVacancies(): UseVacanciesReturn {
  const [vacancies, setVacancies] = useState<VacanciesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // Get filters from URL
  const filters = {
    type: searchParams.get('type') || '',
    sort: searchParams.get('sort') || 'recent'
  }
  const searchQuery = searchParams.get('q') || ''

  const loadVacancies = async () => {
    try {
      setLoading(true)
      setError('')
      
      const params: any = {
        page: 1,
        page_size: 20
      }
      
      if (filters.type) {
        params.type = filters.type as 'ADMINISTRATIVO' | 'OPERATIVO'
      }
      
      if (searchQuery.trim()) {
        params.q = searchQuery.trim()
      }
      
      const data = await listPublicVacancies(params)
      
      // Apply client-side sorting
      if (data.items) {
        let sortedItems = [...data.items]
        
        switch (filters.sort) {
          case 'alphabetical':
            sortedItems.sort((a, b) => a.position.localeCompare(b.position))
            break
          case 'type':
            sortedItems.sort((a, b) => a.type.localeCompare(b.type))
            break
          case 'recent':
          default:
            sortedItems.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            break
        }
        
        data.items = sortedItems
      }
      
      setVacancies(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar las vacantes')
      setVacancies(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVacancies()
  }, [searchParams])

  const handleFilterChange = (newFilters: { type: string; sort: string }) => {
    const newParams = new URLSearchParams(searchParams)
    
    if (newFilters.type) {
      newParams.set('type', newFilters.type)
    } else {
      newParams.delete('type')
    }
    
    if (newFilters.sort && newFilters.sort !== 'recent') {
      newParams.set('sort', newFilters.sort)
    } else {
      newParams.delete('sort')
    }
    
    setSearchParams(newParams)
  }

  const handleViewDetails = (id: string) => {
    navigate(`/vacantes/${id}`)
  }

  return {
    vacancies,
    loading,
    error,
    filters,
    handleFilterChange,
    handleViewDetails
  }
}