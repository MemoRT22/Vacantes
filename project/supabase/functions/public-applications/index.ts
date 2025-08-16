import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Database {
  public: {
    Functions: {
      apply_to_vacancy: {
        Args: {
          p_vacancy_id: string
          p_candidate: any
          p_files: any
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
    // Use service role for this operation since it needs to create records
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'POST') {
      return await submitApplication(supabase, req)
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

async function submitApplication(supabase: any, req: Request) {
  const formData = await req.formData()
  
  const vacancyId = formData.get('vacancy_id') as string
  const candidateData = JSON.parse(formData.get('candidate') as string)
  
  if (!vacancyId || !candidateData) {
    throw new Error('Missing required fields: vacancy_id, candidate')
  }

  // Extract files
  const filesWithUrls: any[] = []
  const fileEntries = Array.from(formData.entries())
  
  // Group file entries by index
  const fileGroups: Record<string, any> = {}
  
  for (const [key, value] of fileEntries) {
    if (key.startsWith('files[')) {
      const match = key.match(/files\[(\d+)\]\[(\w+)\]/)
      if (match) {
        const index = match[1]
        const field = match[2]
        
        if (!fileGroups[index]) {
          fileGroups[index] = {}
        }
        
        fileGroups[index][field] = value
      }
    }
  }
  
  // Convert to files array and simulate upload
  for (const group of Object.values(fileGroups)) {
    if (group.doc && group.file) {
      const file = group.file as File
      
      // In a real implementation, upload to Supabase Storage here
      // For now, we'll use a placeholder URL
      filesWithUrls.push({
        doc: group.doc,
        filename: file.name,
        mimetype: file.type,
        size: file.size,
        temp_url: `temp://uploaded/${file.name}`
      })
    }
  }

  const { data, error } = await supabase.rpc('apply_to_vacancy', {
    p_vacancy_id: vacancyId,
    p_candidate: candidateData,
    p_files: filesWithUrls
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}