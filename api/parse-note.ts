export const config = { runtime: 'edge' }; // Edge runtime is fast; remove if you prefer Node

type AIPromptSettings = {
  template: string;
  includeTermExplanations?: boolean;
  maxLength?: number;
};

const DEFAULT_AI_PROMPT = `Transform the following brief note into a comprehensive educational permanent note:\n\n{noteContent}`;

const SYSTEM_INSTRUCTION = `You are a helpful assistant that transforms brief notes into comprehensive, educational permanent notes.

CRITICAL: You MUST respond with valid JSON in this exact format:
{
  "title": "A concise, descriptive title for the note",
  "content": "The comprehensive, well-structured permanent note content",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Requirements:
- title: Short, clear title (5-10 words max)
- content: Full transformed note with depth and clarity
- keywords: 3-7 relevant keywords for categorization
- ONLY return valid JSON, no additional text or markdown
- Focus on clarity, depth, and educational value
- IMPORTANT: DO NOT extrapolate or add information beyond what's in the original note.`;

// Helper: make the upstream LLM call
async function callLLM(userPrompt: string, maxLength: number) {
  // Example using OpenAI's Chat Completions API via fetch.
  // If you're using a library like Vercel's AI SDK, you can adapt accordingly.
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured: missing OPENAI_API_KEY' }), { status: 500 });
  }

  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: Math.min(maxLength || 2000, 4000),
    temperature: 0.2,
  };

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    const status = r.status;
    let message = errText || `Upstream error: ${status}`;
    // Map errors similar to your client-side logic
    if (status === 401) message = 'Invalid API key';
    else if (status === 429) message = 'Rate limit exceeded';
    else if (status >= 500) message = 'OpenAI service unavailable';
    return new Response(JSON.stringify({ error: message, status }), { status: 502 });
  }

  const data = await r.json() as any;
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return new Response(JSON.stringify({ error: 'Empty response from AI' }), { status: 502 });
  }

  // Ensure we return valid JSON as per your app's expectation
  try {
    const parsed = JSON.parse(text);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // If the model returned extra text, try to extract JSON fallback (optional)
    // For now, just return an error to fail fast.
    return new Response(JSON.stringify({ error: 'AI did not return valid JSON' }), { status: 502 });
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { noteContent, settings } = await req.json() as { noteContent: string; settings?: AIPromptSettings };

    // Input validation (mirrors your client-side checks)
    if (!noteContent || !noteContent.trim()) {
      return new Response(JSON.stringify({ error: 'Note content cannot be empty' }), { status: 400 });
    }
    if (noteContent.length > 10000) {
      return new Response(JSON.stringify({ error: 'Note content is too long (max 10,000 characters)' }), { status: 400 });
    }

    const s: AIPromptSettings = {
      template: settings?.template || DEFAULT_AI_PROMPT,
      includeTermExplanations: settings?.includeTermExplanations ?? true,
      maxLength: settings?.maxLength ?? 2000,
    };

    const userPrompt = s.template.replace('{noteContent}', noteContent);
    return await callLLM(userPrompt, s.maxLength || 2000);
  } catch (e: any) {
    console.error('Relay error:', e);
    return new Response(JSON.stringify({ error: 'Failed to process note with AI' }), { status: 500 });
  }
}

