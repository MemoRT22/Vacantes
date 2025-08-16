import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
}

interface Database {
  public: {
    Functions: {
      list_vacancies_admin: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_type?: string
          p_is_active?: boolean
        }
        Returns: any
      }
      list_my_vacancies: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_type?: string
          p_is_active?: boolean
        }
        Returns: any
      }
      get_vacancy_with_docs: {
        Args: {
          p_vacancy_id: string
        }
        Returns: any
      }
      create_vacancy_with_docs: {
        Args: {
          p_type: string
          p_position: string
          p_objetivos?: string
          p_funciones?: string
          p_escolaridad?: string
          p_experiencia_minima?: string
          p_conocimientos_tecnicos?: string
          p_habilidades?: string
          p_manager_id: string
          p_is_active?: boolean
          p_required_docs?: any
        }
        Returns: any
      }
      update_vacancy_with_docs: {
        Args: {
          p_vacancy_id: string
          p_type?: string
          p_position?: string
          p_objetivos?: string
          p_funciones?: string
          p_escolaridad?: string
          p_experiencia_minima?: string
          p_conocimientos_tecnicos?: string
          p_habilidades?: string
          p_manager_id?: string
          p_is_active?: boolean
        }
        Returns: any
      }
      set_vacancy_required_docs: {
        Args: {
          p_vacancy_id: string
          p_items: any
        }
        Returns: any
      }
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Client with user context for RLS operations
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const userClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Service role client for admin operations (if needed)
    const adminClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const lastSegment = pathSegments[pathSegments.length - 1]

    switch (req.method) {
      case 'GET':
        if (lastSegment === 'admin') {
          return await listVacanciesAdmin(userClient, url.searchParams)
        } else if (lastSegment === 'my') {
          return await listMyVacancies(userClient, url.searchParams)
        } else if (pathSegments.length >= 2 && pathSegments[pathSegments.length - 2] === 'vacancy') {
          const vacancyId = lastSegment
          return await getVacancy(userClient, vacancyId)
        }
        break

      case 'POST':
        if (lastSegment === 'vacancies') {
          return await createVacancy(userClient, req)
        }
        break

      case 'PATCH':
        if (pathSegments.length >= 2 && pathSegments[pathSegments.length - 2] === 'vacancy') {
          const vacancyId = lastSegment
          return await updateVacancy(userClient, req, vacancyId)
        }
        break

      case 'PUT':
        if (pathSegments.length >= 3 && pathSegments[pathSegments.length - 2] === 'docs') {
          const vacancyId = pathSegments[pathSegments.length - 3]
          return await setVacancyDocs(userClient, req, vacancyId)
        }
        break
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function listVacanciesAdmin(supabase: any, searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('page_size') || '20')
  const type = searchParams.get('type') || null
  const isActive = searchParams.get('is_active') ? searchParams.get('is_active') === 'true' : null

  const { data, error } = await supabase.rpc('list_vacancies_admin', {
    p_page: page,
    p_page_size: pageSize,
    p_type: type,
    p_is_active: isActive
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function listMyVacancies(supabase: any, searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('page_size') || '20')
  const type = searchParams.get('type') || null
  const isActive = searchParams.get('is_active') ? searchParams.get('is_active') === 'true' : null

  const { data, error } = await supabase.rpc('list_my_vacancies', {
    p_page: page,
    p_page_size: pageSize,
    p_type: type,
    p_is_active: isActive
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getVacancy(supabase: any, vacancyId: string) {
  const { data, error } = await supabase.rpc('get_vacancy_with_docs', {
    p_vacancy_id: vacancyId
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function createVacancy(supabase: any, req: Request) {
  const body = await req.json()
  const {
    type,
    position,
    objetivos,
    funciones,
    escolaridad,
    experiencia_minima,
    conocimientos_tecnicos,
    habilidades,
    manager_id,
    is_active = true,
    required_docs = []
  } = body

  if (!type || !position || !manager_id) {
    throw new Error('Missing required fields: type, position, manager_id')
  }

  const { data, error } = await supabase.rpc('create_vacancy_with_docs', {
    p_type: type,
    p_position: position,
    p_objetivos: objetivos,
    p_funciones: funciones,
    p_escolaridad: escolaridad,
    p_experiencia_minima: experiencia_minima,
    p_conocimientos_tecnicos: conocimientos_tecnicos,
    p_habilidades: habilidades,
    p_manager_id: manager_id,
    p_is_active: is_active,
    p_required_docs: required_docs
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateVacancy(supabase: any, req: Request, vacancyId: string) {
  const body = await req.json()
  const {
    type,
    position,
    objetivos,
    funciones,
    escolaridad,
    experiencia_minima,
    conocimientos_tecnicos,
    habilidades,
    manager_id,
    is_active
  } = body

  const { data, error } = await supabase.rpc('update_vacancy_with_docs', {
    p_vacancy_id: vacancyId,
    p_type: type,
    p_position: position,
    p_objetivos: objetivos,
    p_funciones: funciones,
    p_escolaridad: escolaridad,
    p_experiencia_minima: experiencia_minima,
    p_conocimientos_tecnicos: conocimientos_tecnicos,
    p_habilidades: habilidades,
    p_manager_id: manager_id,
    p_is_active: is_active
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function setVacancyDocs(supabase: any, req: Request, vacancyId: string) {
  const body = await req.json()
  const { items } = body

  if (!Array.isArray(items)) {
    throw new Error('Items must be an array')
  }

  const { data, error } = await supabase.rpc('set_vacancy_required_docs', {
    p_vacancy_id: vacancyId,
    p_items: items
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}