import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
}

interface Database {
  public: {
    Functions: {
      import_question_bank_csv: {
        Args: {
          p_kind: string
          p_version?: number
          p_activate?: boolean
          p_csv_data: any
        }
        Returns: any
      }
      schedule_rh_interview: {
        Args: {
          p_application_id: string
          p_at: string
          p_location: string
        }
        Returns: any
      }
      start_rh_interview: {
        Args: {
          p_application_id: string
        }
        Returns: any
      }
      save_rh_interview_draft: {
        Args: {
          p_application_id: string
          p_answers: any
          p_extra_questions?: any
        }
        Returns: any
      }
      finalize_rh_interview: {
        Args: {
          p_application_id: string
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

    // Service role client for admin operations
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
      case 'POST':
        if (lastSegment === 'import-csv') {
          return await importQuestionBankCSV(userClient, req)
        } else if (lastSegment === 'schedule') {
          return await scheduleRHInterview(userClient, req)
        } else if (lastSegment === 'start') {
          return await startRHInterview(userClient, req)
        } else if (lastSegment === 'finalize') {
          return await finalizeRHInterview(userClient, req)
        }
        break

      case 'PATCH':
        if (lastSegment === 'draft') {
          return await saveRHInterviewDraft(userClient, req)
        }
        break

      case 'GET':
        if (lastSegment === 'banks') {
          return await getQuestionBanks(userClient)
        } else if (pathSegments.includes('interview')) {
          const applicationId = pathSegments[pathSegments.length - 1]
          return await getRHInterview(userClient, applicationId)
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

async function importQuestionBankCSV(supabase: any, req: Request) {
  const formData = await req.formData()
  const kind = formData.get('kind') as string
  const version = formData.get('version') ? parseInt(formData.get('version') as string) : null
  const activate = formData.get('activate') === 'true'
  const csvFile = formData.get('csv_file') as File

  if (!kind || !csvFile) {
    throw new Error('Missing required fields: kind, csv_file')
  }

  // Parse CSV
  const csvText = await csvFile.text()
  const lines = csvText.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',').map(h => h.trim())
  
  if (!headers.includes('ord') || !headers.includes('text') || !headers.includes('is_required')) {
    throw new Error('CSV must contain columns: ord, text, is_required')
  }

  const csvData = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: any = {}
    
    headers.forEach((header, index) => {
      if (header === 'ord') {
        row[header] = parseInt(values[index])
      } else if (header === 'is_required') {
        row[header] = values[index].toLowerCase() === 'true'
      } else {
        row[header] = values[index]
      }
    })
    
    csvData.push(row)
  }

  const { data, error } = await supabase.rpc('import_question_bank_csv', {
    p_kind: kind,
    p_version: version,
    p_activate: activate,
    p_csv_data: csvData
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function scheduleRHInterview(supabase: any, req: Request) {
  const body = await req.json()
  const { application_id, at, location } = body

  if (!application_id || !at || !location) {
    throw new Error('Missing required fields: application_id, at, location')
  }

  const { data, error } = await supabase.rpc('schedule_rh_interview', {
    p_application_id: application_id,
    p_at: at,
    p_location: location
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function startRHInterview(supabase: any, req: Request) {
  const body = await req.json()
  const { application_id } = body

  if (!application_id) {
    throw new Error('Missing required field: application_id')
  }

  const { data, error } = await supabase.rpc('start_rh_interview', {
    p_application_id: application_id
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function saveRHInterviewDraft(supabase: any, req: Request) {
  const body = await req.json()
  const { application_id, answers, extra_questions } = body

  if (!application_id || !answers) {
    throw new Error('Missing required fields: application_id, answers')
  }

  const { data, error } = await supabase.rpc('save_rh_interview_draft', {
    p_application_id: application_id,
    p_answers: answers,
    p_extra_questions: extra_questions || []
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function finalizeRHInterview(supabase: any, req: Request) {
  const body = await req.json()
  const { application_id } = body

  if (!application_id) {
    throw new Error('Missing required field: application_id')
  }

  const { data, error } = await supabase.rpc('finalize_rh_interview', {
    p_application_id: application_id
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getQuestionBanks(supabase: any) {
  const { data, error } = await supabase
    .from('question_banks')
    .select(`
      id,
      name,
      kind,
      is_active,
      created_at,
      question_bank_versions!inner (
        id,
        version,
        is_active,
        created_at,
        questions (
          id,
          ord,
          text,
          is_required
        )
      )
    `)
    .eq('question_bank_versions.is_active', true)
    .order('kind')

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getRHInterview(supabase: any, applicationId: string) {
  const { data, error } = await supabase
    .from('interview_rh')
    .select(`
      *,
      question_bank_versions (
        id,
        version,
        question_banks (
          name,
          kind
        ),
        questions (
          id,
          ord,
          text,
          is_required
        )
      )
    `)
    .eq('application_id', applicationId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}