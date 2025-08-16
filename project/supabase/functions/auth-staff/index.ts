import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

interface Database {
  public: {
    Functions: {
      get_user_profile: {
        Returns: any
      }
      list_staff_users: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_role?: string
          p_active?: boolean
        }
        Returns: any
      }
      create_staff_user: {
        Args: {
          p_full_name: string
          p_email: string
          p_role: string
          p_active?: boolean
          p_password?: string
        }
        Returns: any
      }
      update_staff_user: {
        Args: {
          p_id: string
          p_full_name?: string
          p_email?: string
          p_role?: string
          p_active?: boolean
        }
        Returns: any
      }
      delete_staff_user: {
        Args: {
          p_id: string
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

  // Check for required environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_URL environment variable is not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_ANON_KEY environment variable is not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Client with user context for RLS operations
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const userClient = createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
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
      supabaseUrl,
      supabaseServiceKey,
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
    const path = url.pathname.split('/').pop()

    switch (req.method) {
      case 'GET':
        if (path === 'profile') {
          return await getProfile(userClient)
        } else if (path === 'users') {
          return await listUsers(userClient, url.searchParams)
        }
        break

      case 'POST':
        if (path === 'users') {
          return await createUser(adminClient, userClient, req)
        }
        break

      case 'PATCH':
        if (path?.startsWith('users/')) {
          const userId = path.replace('users/', '')
          return await updateUser(adminClient, userClient, req, userId)
        }
        break

      case 'DELETE':
        if (path?.startsWith('users/')) {
          const userId = path.replace('users/', '')
          return await deleteUser(adminClient, userClient, userId)
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

async function getProfile(supabase: any) {
  const { data, error } = await supabase.rpc('get_user_profile')
  
  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function listUsers(supabase: any, searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('page_size') || '20')
  const role = searchParams.get('role') || null
  const active = searchParams.get('active') ? searchParams.get('active') === 'true' : null

  const { data, error } = await supabase.rpc('list_staff_users', {
    p_page: page,
    p_page_size: pageSize,
    p_role: role,
    p_active: active
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function createUser(adminClient: any, userClient: any, req: Request) {
  const body = await req.json()
  const { full_name, email, role, active = true, password } = body

  if (!full_name || !email || !role) {
    throw new Error('Missing required fields: full_name, email, role')
  }

  // First create the auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: password || generateRandomPassword(),
    email_confirm: true,
    user_metadata: {
      full_name,
      role
    }
  })

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`)
  }

  try {
    // Then create the staff user with the same ID
    const { data, error } = await userClient.rpc('create_staff_user', {
      p_full_name: full_name,
      p_email: email,
      p_role: role,
      p_active: active
    })

    if (error) {
      // Rollback auth user creation
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw new Error(error.message)
    }

    // Update the staff_users record with the correct auth user ID
    const { error: updateError } = await adminClient
      .from('staff_users')
      .update({ id: authData.user.id })
      .eq('email', email)

    if (updateError) {
      // Rollback both
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw new Error(updateError.message)
    }

    return new Response(
      JSON.stringify({ 
        id: authData.user.id, 
        message: 'User created successfully',
        temp_password: password || 'Generated password sent to user'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // Cleanup auth user if staff user creation failed
    if (authData?.user?.id) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
    }
    throw error
  }
}

async function updateUser(adminClient: any, userClient: any, req: Request, userId: string) {
  const body = await req.json()
  const { full_name, email, role, active } = body

  // Update auth user if email is changing
  if (email) {
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      email,
      user_metadata: { full_name, role }
    })

    if (authError) {
      throw new Error(`Failed to update auth user: ${authError.message}`)
    }
  }

  // Update staff user
  const { data, error } = await userClient.rpc('update_staff_user', {
    p_id: userId,
    p_full_name: full_name,
    p_email: email,
    p_role: role,
    p_active: active
  })

  if (error) {
    throw new Error(error.message)
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function deleteUser(adminClient: any, userClient: any, userId: string) {
  // First delete from staff_users (this will check references)
  const { data, error } = await userClient.rpc('delete_staff_user', {
    p_id: userId
  })

  if (error) {
    throw new Error(error.message)
  }

  // Then delete from auth
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId)
  
  if (authError) {
    console.error('Failed to delete auth user:', authError.message)
    // Don't throw here as the staff user is already deleted
  }

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}