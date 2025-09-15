import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

interface ReportSchedule {
  id: string;
  frequency: string;
  day_of_week?: number;
  day_of_month?: number;
  time_of_day: string;
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get current date and time
    const now = new Date()
    const currentDay = now.getDay() // 0-6, where 0 is Sunday
    const currentDayOfMonth = now.getDate() // 1-31
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // Find all active report schedules
    const { data: schedules, error: schedulesError } = await supabaseClient
      .from('report_schedules')
      .select('*')
      .eq('is_active', true)

    if (schedulesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch report schedules', details: schedulesError }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Filter schedules that should run now
    const schedulesToRun = (schedules as ReportSchedule[]).filter(schedule => {
      // Parse time of day
      const [hours, minutes] = schedule.time_of_day.split(':').map(Number)
      
      // Check if it's time to run based on frequency
      switch (schedule.frequency) {
        case 'daily':
          return currentHour === hours && currentMinute === minutes
        
        case 'weekly':
          return currentDay === schedule.day_of_week && 
                 currentHour === hours && 
                 currentMinute === minutes
        
        case 'monthly':
          return currentDayOfMonth === schedule.day_of_month && 
                 currentHour === hours && 
                 currentMinute === minutes
        
        default:
          return false
      }
    })

    // Process each schedule
    const results = await Promise.all(
      schedulesToRun.map(async schedule => {
        try {
          // Call the send-scheduled-report function
          const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-scheduled-report`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              },
              body: JSON.stringify({ scheduleId: schedule.id }),
            }
          )

          const result = await response.json()
          return {
            scheduleId: schedule.id,
            success: response.ok,
            result,
          }
        } catch (error) {
          return {
            scheduleId: schedule.id,
            success: false,
            error: error.message,
          }
        }
      })
    )

    return new Response(
      JSON.stringify({
        message: `Processed ${schedulesToRun.length} scheduled reports`,
        results,
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
