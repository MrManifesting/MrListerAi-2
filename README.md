# MrLister AI Assistants

This project provides an Express server and React client for listing and inventory management.

## Assistant Team Endpoint

A new endpoint `/api/assistants/team-run` allows running a sequence of OpenAI assistants on the same thread. The request body should include an array of steps, each specifying an `assistantName` and optional `instructions`. If no `threadId` is provided, a new thread is created.

Example request:
```json
{
  "steps": [
    { "assistantName": "inventory-expert" },
    { "assistantName": "marketing-expert", "instructions": "Focus on Etsy" }
  ]
}
```
The response includes the `threadId` used and an array of assistant messages returned from each step.
