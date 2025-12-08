import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's token to verify permissions
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the requesting user is admin or operator
    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin or operator role
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)

    if (rolesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to check user roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userRoles = roles?.map(r => r.role) || []
    if (!userRoles.includes('admin') && !userRoles.includes('operator')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only admin or operator can delete users.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the user ID to delete from request body
    const { userId } = await req.json()
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent self-deletion
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    console.log('Deleting related data for user:', userId)

    // Delete related data first - order matters due to foreign key constraints
    // 1. Delete audit_logs (references auth.users)
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .delete()
      .eq('user_id', userId)
    
    if (auditError) {
      console.log('Error deleting audit_logs (non-critical):', auditError.message)
    }

    // 2. Delete email_recipient_presets (references user_id)
    const { error: presetError } = await supabaseAdmin
      .from('email_recipient_presets')
      .delete()
      .eq('user_id', userId)
    
    if (presetError) {
      console.log('Error deleting email_recipient_presets (non-critical):', presetError.message)
    }

    // 3. Delete survey_analysis_comments (references author_id)
    const { error: commentsError } = await supabaseAdmin
      .from('survey_analysis_comments')
      .delete()
      .eq('author_id', userId)
    
    if (commentsError) {
      console.log('Error deleting survey_analysis_comments (non-critical):', commentsError.message)
    }

    // 4. Delete user_roles
    const { error: rolesDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
    
    if (rolesDeleteError) {
      console.log('Error deleting user_roles:', rolesDeleteError.message)
    }

    // 5. Delete profiles
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profilesError) {
      console.log('Error deleting profiles:', profilesError.message)
    }

    console.log('Related data deleted, now deleting auth user')

    // Delete the user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError)
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User deleted successfully:', userId)

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
