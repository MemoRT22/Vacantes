import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface Database {
  public: {
    Functions: {
      get_after_docs_progress: {
        Args: {
          p_folio: string
          p_email: string
        }
        Returns: any
      }
      start_after_doc_upload: {
        Args: {
          p_folio: string
          p_email: string
          p_doc: string
          p_filename: string
          p_mimetype: string
          p_size: number
        }
        Returns: any
      }
      finalize_after_doc_upload: {
        Args: {
          p_upload_id: string
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
    // Use service role for these operations
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const lastSegment = pathSegments[pathSegments.length - 1]

    switch (req.method) {
      case 'POST':
        if (lastSegment === 'progress') {
          return await getAfterDocsProgress(supabase, req)
        } else if (lastSegment === 'start-upload') {
          return await startAfterDocUpload(supabase, req)
        } else if (lastSegment === 'finalize-upload') {
          return await finalizeAfterDocUpload(supabase, req)
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

async function getAfterDocsProgress(supabase: any, req: Request) {
  const body = await req.json()
  const { folio, email } = body
  
  if (!folio || !email) {
    throw new Error('Folio and email are required')
  }

  // Validate folio format
  const folioPattern = /^BIN-\d{4}-\d{5}$/
  if (!folioPattern.test(folio)) {
    throw new Error('Invalid folio format')
  }

  // Validate email format
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(email)) {
    throw new Error('Invalid email format')
  }

  const { data, error } = await supabase.rpc('get_after_docs_progress', {
    p_folio: folio,
    p_email: email
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function startAfterDocUpload(supabase: any, req: Request) {
  const body = await req.json()
  const { folio, email, doc, filename, mimetype, size } = body
  
  if (!folio || !email || !doc || !filename || !mimetype || size === undefined) {
    throw new Error('Missing required fields: folio, email, doc, filename, mimetype, size')
  }

  const { data, error } = await supabase.rpc('start_after_doc_upload', {
    p_folio: folio,
    p_email: email,
    p_doc: doc,
    p_filename: filename,
    p_mimetype: mimetype,
    p_size: size
  })

  if (error) {
    throw new Error(error.message)
  }

  // Generate pre-signed URL for upload
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('candidate-docs')
    .createSignedUploadUrl(data.upload_url, {
      upsert: true
    })

  if (uploadError) {
    throw new Error(`Failed to create upload URL: ${uploadError.message}`)
  }

  return new Response(
    JSON.stringify({
      upload_id: data.upload_id,
      upload_url: uploadData.signedUrl,
      max_version_expected: data.max_version_expected
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function finalizeAfterDocUpload(supabase: any, req: Request) {
  const body = await req.json()
  const { upload_id } = body
  
  if (!upload_id) {
    throw new Error('Missing required field: upload_id')
  }

  const { data, error } = await supabase.rpc('finalize_after_doc_upload', {
    p_upload_id: upload_id
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}