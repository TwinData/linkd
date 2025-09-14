# Setting Up Scheduled Reports in Lin-KD Connect

This document explains how to set up and use the scheduled reports feature in Lin-KD Connect.

## Overview

The scheduled reports feature allows you to automatically generate and email reports on a daily, weekly, or monthly basis. This is useful for keeping stakeholders informed about transaction activity, client patterns, and float deposits without manual intervention.

## Prerequisites

Before setting up scheduled reports, ensure:

1. Your Supabase project is properly configured
2. You have admin access to the Lin-KD Connect application
3. Email service credentials are set up in your environment variables

## Environment Variables

The following environment variables need to be set in your Supabase project:

```
SMTP_HOSTNAME=smtp.example.com
SMTP_PORT=465
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-email-password
EMAIL_FROM=noreply@linkd-connect.com
```

## Setting Up a Scheduled Report

1. Navigate to the **Reports** page in Lin-KD Connect
2. Click on the **Scheduled Reports** tab
3. Click the **Schedule New Report** button
4. Fill in the report details:
   - **Report Name**: A descriptive name for the report
   - **Report Type**: Choose from Transactions, Clients, or Float Deposits
   - **Frequency**: Select Daily, Weekly, or Monthly
   - **Day of Week/Month**: For weekly or monthly reports, select which day to send
   - **Time of Day**: Select when the report should be sent (in 24-hour format)
   - **Email Recipients**: Enter comma-separated email addresses
   - **Description**: Optional description of the report's purpose

5. Click **Create Schedule** to save the report schedule

## How It Works

The scheduled reports system consists of several components:

1. **Database Table**: `report_schedules` stores all scheduled report configurations
2. **Cron Job**: The `process-scheduled-reports` function runs every minute to check for reports that need to be sent
3. **Report Generator**: When a report is due, the system generates a PDF report with the requested data
4. **Email Service**: The report is emailed to the specified recipients

## Supabase Functions

The system uses three Supabase Edge Functions:

1. `process-scheduled-reports`: Checks for reports that need to be sent based on the current time
2. `send-scheduled-report`: Generates and sends a specific report
3. `_shared/reports.ts`: Contains the report generation logic
4. `_shared/email.ts`: Handles email delivery

## Setting Up the Cron Job

To enable automatic report processing, you need to set up a cron job to trigger the `process-scheduled-reports` function every minute:

1. In your Supabase dashboard, go to **Database** > **Functions**
2. Find the `process-scheduled-reports` function
3. Click on **Hooks** and add a new cron job
4. Set the schedule to `* * * * *` (runs every minute)
5. Save the cron job

## Troubleshooting

If reports are not being sent as expected:

1. Check the Supabase logs for any errors in the functions
2. Verify that the SMTP credentials are correct
3. Ensure the report schedule is marked as active
4. Check that the email recipients are valid addresses
5. Verify that the cron job is running correctly

## Security Considerations

- Reports contain sensitive business data, so ensure email recipients are authorized to receive this information
- The system uses row-level security to ensure users can only schedule reports for data they have access to
- Admin users can manage all report schedules

## Limitations

- Currently, reports are limited to three types: Transactions, Clients, and Float Deposits
- Custom report types are not yet supported
- Reports are sent as PDF attachments only
- The maximum number of recipients per report is 10
