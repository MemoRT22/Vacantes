import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface Database {
  public: {
    Functions: {
      get_rh_dashboard_summary: {
        Args: {
          p_from?: string
          p_to?: string
        }
        Returns: any
      }
      list_applications_admin: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_vacancy_id?: string
          p_status?: string
          p_q?: string
          p_from?: string
          p_to?: string
        }
        Returns: any
      }
      export_applications_by_vacancy_csv: {
        Args: {
          p_vacancy_id: string
          p_status?: string
          p_from?: string
          p_to?: string
        }
        Returns: any
      }
      refresh_dashboard_views: {
        Returns: void
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
      case 'GET':
        if (lastSegment === 'summary') {
          return await getDashboardSummary(userClient, url.searchParams)
        } else if (lastSegment === 'applications') {
          return await listApplicationsAdmin(userClient, url.searchParams)
        } else if (lastSegment === 'refresh-views') {
          return await refreshViews(userClient)
        }
        break

      case 'POST':
        if (lastSegment === 'export-csv') {
          return await exportCSV(userClient, adminClient, req)
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

async function getDashboardSummary(supabase: any, searchParams: URLSearchParams) {
  const from = searchParams.get('from') || null
  const to = searchParams.get('to') || null

  const { data, error } = await supabase.rpc('get_rh_dashboard_summary', {
    p_from: from,
    p_to: to
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function listApplicationsAdmin(supabase: any, searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('page_size') || '20')
  const vacancyId = searchParams.get('vacancy_id') || null
  const status = searchParams.get('status') || null
  const q = searchParams.get('q') || null
  const from = searchParams.get('from') || null
  const to = searchParams.get('to') || null

  const { data, error } = await supabase.rpc('list_applications_admin', {
    p_page: page,
    p_page_size: pageSize,
    p_vacancy_id: vacancyId,
    p_status: status,
    p_q: q,
    p_from: from,
    p_to: to
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function exportCSV(userClient: any, adminClient: any, req: Request) {
  const body = await req.json()
  const { vacancy_id, status, from, to } = body

  if (!vacancy_id) {
    throw new Error('Missing required field: vacancy_id')
  }

  // Generate CSV content using the database function
  const { data, error } = await userClient.rpc('export_applications_by_vacancy_csv', {
    p_vacancy_id: vacancy_id,
    p_status: status || null,
    p_from: from || null,
    p_to: to || null
  })

  if (error) {
    throw new Error(error.message)
  }

  // Upload CSV to storage
  const csvContent = data.csv_content
  const filename = data.filename
  const filePath = `exports/${data.export_id}/${filename}`

  const { error: uploadError } = await adminClient.storage
    .from('csv-exports')
    .upload(filePath, csvContent, {
      contentType: 'text/csv',
      upsert: true
    })

  if (uploadError) {
    throw new Error(`Failed to upload CSV: ${uploadError.message}`)
  }

  // Generate signed URL for download
  const { data: urlData, error: urlError } = await adminClient.storage
    .from('csv-exports')
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (urlError) {
    throw new Error(`Failed to create download URL: ${urlError.message}`)
  }

  return new Response(
    JSON.stringify({
      export_id: data.export_id,
      filename: filename,
      url: urlData.signedUrl
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function refreshViews(supabase: any) {
  const { error } = await supabase.rpc('refresh_dashboard_views')

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify({ ok: true, message: 'Dashboard views refreshed' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}