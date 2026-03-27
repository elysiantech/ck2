# Lead Capture via MCP Tools

**Status:** Idea (not implemented)

## Overview

Capture leads inline in chat using MCP tools. The workflow decides when to ask for email based on conversation context, then sends a summary via Resend.

## Flow

1. User interacts with widget builder (3-5 messages)
2. Workflow calls MCP tool → renders email capture widget inline
3. User enters email
4. Workflow calls `send_email` MCP tool
5. Backend saves email to DB + sends via Resend
6. Workflow continues: "Great, I'll send you a summary!"

## MCP Tools Needed

### 1. Email Capture Widget

Already exists - MCP server can render inline widgets.

### 2. Send Email Tool

```typescript
{
  name: "send_email",
  parameters: {
    to: string,
    subject: string,
    body: string,  // or template_id + variables
    thread_id?: string,  // for linking lead to conversation
  }
}
```

**Handler:**
```typescript
async function send_email({ to, subject, body, thread_id }) {
  // Save lead to DB
  await db.query(
    'INSERT INTO leads (email, thread_id, created_at) VALUES ($1, $2, NOW())',
    [to, thread_id]
  );

  // Send via Resend
  await resend.emails.send({
    from: 'noreply@yourdomain.com',
    to,
    subject,
    html: body,
  });

  return { success: true };
}
```

## Workflow Instructions

Add to hosted workflow system prompt:

```
After gathering the user's requirements and generating 2-3 widgets,
offer to email them a summary of the conversation. Use the email
capture widget to collect their email, then send_email with a
summary of what was discussed and links to their widgets.
```

## Database

Add leads table (or use thread metadata):

```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  thread_id TEXT REFERENCES threads(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

Or store in thread metadata:
```typescript
thread.metadata.lead_email = email;
```

## Email Content

Options:
- Plain summary of conversation
- Links to saved widgets
- CTA to book a demo / contact sales

## Open Questions

- When exactly should workflow prompt for email? After X messages? After first widget generated?
- What email template/content?
- Should widgets be shareable via link (requires hosting) or just HTML download?
- Follow-up email sequence?
