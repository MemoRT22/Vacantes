import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Database {
  public: {
    Functions: {
      get_application_status: {
        Args: {
          p_folio: string
          p_email: string
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
    // Use anon key for public access
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    if (req.method === 'POST') {
      return await getApplicationStatus(supabase, req)
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getApplicationStatus(supabase: any, req: Request) {
  const body = await req.json()
  const { folio, email } = body
  
  if (!folio || !email) {
    throw new Error('Folio y correo electrónico son requeridos')
  }

  // Validate folio format (BIN-YYYY-#####)
  const folioPattern = /^BIN-\d{4}-\d{5}$/
  if (!folioPattern.test(folio)) {
    return new Response(
      JSON.stringify({ 
        error: 'No se encontró una aplicación con esa combinación de folio y correo electrónico.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate email format
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(email)) {
    return new Response(
      JSON.stringify({ 
        error: 'Formato de correo electrónico inválido' 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data, error } = await supabase.rpc('get_application_status', {
    p_folio: folio,
    p_email: email
  })

  if (error) {
    throw new Error(error.message)
  }

  // If the function returned an error object, return it as-is
  if (data && data.error) {
    return new Response(
      JSON.stringify(data),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}