import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
}

interface Database {
  public: {
    Functions: {
      start_evaluation: {
        Args: {
          p_application_id: string
        }
        Returns: any
      }
      save_evaluation_scores: {
        Args: {
          p_application_id: string
          p_scores: any
        }
        Returns: any
      }
      save_evaluation_summary: {
        Args: {
          p_application_id: string
          p_factors_for: string
          p_factors_against: string
          p_conclusion: string
          p_references_laborales?: string
        }
        Returns: any
      }
      finalize_accept: {
        Args: {
          p_application_id: string
        }
        Returns: any
      }
      finalize_reject: {
        Args: {
          p_application_id: string
        }
        Returns: any
      }
      get_evaluation_context: {
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
      case 'GET':
        if (lastSegment === 'context') {
          const applicationId = url.searchParams.get('application_id')
          if (!applicationId) {
            throw new Error('Missing application_id parameter')
          }
          return await getEvaluationContext(userClient, applicationId)
        }
        break

      case 'POST':
        if (lastSegment === 'start') {
          return await startEvaluation(userClient, req)
        } else if (lastSegment === 'accept') {
          return await finalizeAccept(userClient, req)
        } else if (lastSegment === 'reject') {
          return await finalizeReject(userClient, req)
        }
        break

      case 'PUT':
        if (lastSegment === 'scores') {
          return await saveEvaluationScores(userClient, req)
        } else if (lastSegment === 'summary') {
          return await saveEvaluationSummary(userClient, req)
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

async function getEvaluationContext(supabase: any, applicationId: string) {
  const { data, error } = await supabase.rpc('get_evaluation_context', {
    p_application_id: applicationId
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function startEvaluation(supabase: any, req: Request) {
  const body = await req.json()
  const { application_id } = body

  if (!application_id) {
    throw new Error('Missing required field: application_id')
  }

  const { data, error } = await supabase.rpc('start_evaluation', {
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

async function saveEvaluationScores(supabase: any, req: Request) {
  const body = await req.json()
  const { application_id, scores } = body

  if (!application_id || !scores) {
    throw new Error('Missing required fields: application_id, scores')
  }

  if (!Array.isArray(scores) || scores.length !== 16) {
    throw new Error('Scores must be an array of exactly 16 items')
  }

  const { data, error } = await supabase.rpc('save_evaluation_scores', {
    p_application_id: application_id,
    p_scores: scores
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function saveEvaluationSummary(supabase: any, req: Request) {
  const body = await req.json()
  const { application_id, factors_for, factors_against, conclusion, references_laborales } = body

  if (!application_id || !factors_for || !factors_against || !conclusion) {
    throw new Error('Missing required fields: application_id, factors_for, factors_against, conclusion')
  }

  const { data, error } = await supabase.rpc('save_evaluation_summary', {
    p_application_id: application_id,
    p_factors_for: factors_for,
    p_factors_against: factors_against,
    p_conclusion: conclusion,
    p_references_laborales: references_laborales || ''
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function finalizeAccept(supabase: any, req: Request) {
  const body = await req.json()
  const { application_id } = body

  if (!application_id) {
    throw new Error('Missing required field: application_id')
  }

  const { data, error } = await supabase.rpc('finalize_accept', {
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

async function finalizeReject(supabase: any, req: Request) {
  const body = await req.json()
  const { application_id } = body

  if (!application_id) {
    throw new Error('Missing required field: application_id')
  }

  const { data, error } = await supabase.rpc('finalize_reject', {
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