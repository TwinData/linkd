import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'
import { generateReportPDF } from '../_shared/reports.ts'
import { sendEmail } from '../_shared/email.ts'

interface ReportSchedule {
  id: string;
  user_id: string;
  report_type: string;
  frequency: string;
  day_of_week?: number;
  day_of_month?: number;
  time_of_day: string;
  email_recipients: string[];
  report_name: string;
  report_description?: string;
  is_active: boolean;
  last_sent_at?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the request body
    const { scheduleId } = await req.json()

    if (!scheduleId) {
      return new Response(
        JSON.stringify({ error: 'Schedule ID is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get the report schedule
    const { data: schedule, error: scheduleError } = await supabaseClient
      .from('report_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      return new Response(
        JSON.stringify({ error: 'Report schedule not found', details: scheduleError }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    const reportSchedule = schedule as ReportSchedule

    if (!reportSchedule.is_active) {
      return new Response(
        JSON.stringify({ message: 'Report schedule is inactive' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Generate the report data based on the report type
    let reportData: any[] = []
    let rpcFunction = ''
    
    switch (reportSchedule.report_type) {
      case 'transactions':
        rpcFunction = 'get_user_transaction_stats'
        break
      case 'clients':
        rpcFunction = 'get_client_transaction_patterns'
        break
      case 'float_deposits':
        rpcFunction = 'get_sarahs_share_analysis'
        break
      default:
        throw new Error('Invalid report type')
    }

    // Get the date range for the report
    const now = new Date()
    let startDate: Date
    
    switch (reportSchedule.frequency) {
      case 'daily':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'weekly':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'monthly':
        startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - 1)
        break
      default:
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 30) // Default to 30 days
    }

    // Get the report data
    const { data: reportResult, error: reportError } = await supabaseClient.rpc(
      rpcFunction,
      {
        start_date: startDate.toISOString(),
        end_date: now.toISOString(),
      }
    )

    if (reportError) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate report', details: reportError }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    reportData = reportResult || []

    // Generate PDF report
    const pdfBuffer = await generateReportPDF(
      reportData,
      reportSchedule.report_name,
      reportSchedule.report_type,
      startDate,
      now
    )

    // Send email with the report attached
    const emailResult = await sendEmail({
      to: reportSchedule.email_recipients,
      subject: `${reportSchedule.report_name} - ${new Date().toLocaleDateString()}`,
      html: `
        <h1>${reportSchedule.report_name}</h1>
        <p>Please find attached your scheduled report.</p>
        <p>Report period: ${startDate.toLocaleDateString()} to ${now.toLocaleDateString()}</p>
        ${reportSchedule.report_description ? `<p>${reportSchedule.report_description}</p>` : ''}
        <p>This is an automated email from the Lin-KD Connect system.</p>
      `,
      attachments: [
        {
          filename: `${reportSchedule.report_name.replace(/\s+/g, '-').toLowerCase()}-${now.toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer.toString('base64'),
          encoding: 'base64',
          contentType: 'application/pdf',
        },
      ],
    })

    // Update the last_sent_at timestamp
    const { error: updateError } = await supabaseClient
      .from('report_schedules')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('id', scheduleId)

    if (updateError) {
      console.error('Failed to update last_sent_at timestamp:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Report sent successfully',
        emailResult 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
