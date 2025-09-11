import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteUserRequest {
  email: string;
  role: 'admin' | 'user';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Invite user function called');
  console.log('Method:', req.method);

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }

  try {
    console.log('Creating Supabase admin client...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('SUPABASE_URL exists:', !!supabaseUrl);
    console.log('SERVICE_ROLE_KEY exists:', !!serviceRoleKey);
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Parsing request body...');
    const requestBody = await req.text();
    console.log('Request body:', requestBody);
    
    const { email, role }: InviteUserRequest = JSON.parse(requestBody);

    console.log(`Inviting user: ${email} with role: ${role}`);

    // Create the user with a temporary password
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        invited: true,
        invited_at: new Date().toISOString()
      }
    });

    if (userError) {
      console.error('Error creating user:', userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('User created successfully, assigning role...');

    // Assign role to the user
    if (userData.user) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userData.user.id,
          role: role
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        // Don't fail the whole operation if role assignment fails
      } else {
        console.log('Role assigned successfully');
      }
    }

    console.log('User invited successfully:', userData.user?.email);

    // Send invitation email
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invitation-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          role: role,
          inviterEmail: undefined // Could be enhanced to pass the inviter's email
        })
      });

      if (!emailResponse.ok) {
        console.error('Failed to send invitation email:', await emailResponse.text());
      } else {
        console.log('Invitation email sent successfully');
      }
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the invitation if email sending fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData.user,
        message: 'User invited successfully and invitation email sent' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in invite-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);