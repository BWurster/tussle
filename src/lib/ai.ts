import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { NameEntry, Settings, Gender, OnboardingAnswers, AIProvider } from '../types'

function weightedSample(names: NameEntry[], count: number, alpha: number): NameEntry[] {
  if (names.length === 0) return []
  count = Math.min(count, names.length)

  const weights = names.map(n => Math.pow(Math.max(n.score, 1), alpha))
  const total = weights.reduce((a, b) => a + b, 0)
  const probs = weights.map(w => w / total)

  const selected: NameEntry[] = []
  const available = [...names]
  const availableProbs = [...probs]

  for (let i = 0; i < count; i++) {
    if (available.length === 0) break
    const r = Math.random()
    let cumulative = 0
    let idx = available.length - 1
    for (let j = 0; j < available.length; j++) {
      cumulative += availableProbs[j]
      if (r <= cumulative) { idx = j; break }
    }
    selected.push(available[idx])
    available.splice(idx, 1)
    availableProbs.splice(idx, 1)
    const newTotal = availableProbs.reduce((a, b) => a + b, 0)
    if (newTotal > 0) {
      for (let j = 0; j < availableProbs.length; j++) {
        availableProbs[j] /= newTotal
      }
    }
  }

  return selected
}

async function callAI(provider: AIProvider, apiKey: string, model: string, prompt: string): Promise<string> {
  if (provider === 'claude') {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
    const msg = await client.messages.create({
      model,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const block = msg.content[0]
    return block.type === 'text' ? block.text.trim() : ''
  } else {
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    return completion.choices[0]?.message?.content?.trim() ?? ''
  }
}

export async function fetchAvailableModels(provider: AIProvider, apiKey: string): Promise<string[]> {
  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    })
    if (!res.ok) throw new Error('Failed to fetch models')
    const data = await res.json() as { data: { id: string }[] }
    return data.data.map(m => m.id)
  } else {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error('Failed to fetch models')
    const data = await res.json() as { data: { id: string }[] }
    return data.data
      .map(m => m.id)
      .filter(id => /^(gpt|o1|o3|o4)/.test(id))
      .sort()
  }
}

function resolveModel(settings: Settings): string {
  return settings.aiProvider === 'claude' ? settings.claudeModel : settings.openaiModel
}

export async function generateNewName(
  existingNames: NameEntry[],
  settings: Settings,
  gender: Gender,
): Promise<string> {
  const apiKey = settings.aiProvider === 'claude' ? settings.claudeApiKey : settings.openaiApiKey
  const sampled = weightedSample(existingNames, settings.sampleSize, settings.weightingFactor)
  const nameList = sampled.map(n => n.name).join(', ')

  const prompt = sampled.length > 0
    ? `Generate exactly one unique baby ${gender} name similar in style and feel to these names: ${nameList}. Return only the name itself, nothing else, no punctuation.`
    : `Generate exactly one unique, beautiful baby ${gender} name. Return only the name itself, nothing else, no punctuation.`

  const result = await callAI(settings.aiProvider, apiKey, resolveModel(settings), prompt)
  return result.split('\n')[0].replace(/[^a-zA-Z'-]/g, '').trim()
}

export async function generateSentimentAnalysis(
  topNames: string[],
  gender: Gender,
  settings: Settings,
): Promise<string> {
  const apiKey = settings.aiProvider === 'claude' ? settings.claudeApiKey : settings.openaiApiKey
  const nameList = topNames.join(', ')
  const prompt = `Here are someone's top baby ${gender} names ranked by preference: ${nameList}. Write a fun and insightful 2-3 paragraph analysis of what their taste in names reveals about them — covering style, cultural roots, sound patterns, and personality. Be warm, playful, and a little poetic in tone. No headers, just flowing paragraphs.`
  return callAI(settings.aiProvider, apiKey, resolveModel(settings), prompt)
}

export async function generateInitialNames(
  answers: OnboardingAnswers,
  gender: Gender,
  settings: Settings,
): Promise<string[]> {
  const apiKey = settings.aiProvider === 'claude' ? settings.claudeApiKey : settings.openaiApiKey
  const prompt = `Generate exactly 10 unique baby ${gender} names based on this profile:
- Cultural background: ${answers.heritage || 'not specified'}
- Style preference: ${answers.nameStyle === 'classic' ? 'classic and timeless' : 'modern and unique'}
- Names they love the sound of: ${answers.lovedSounds || 'not specified'}
- Sounds or endings they dislike: ${answers.dislikedSounds || 'none'}
- Vibe words: ${answers.vibes || 'not specified'}

Return exactly 10 names, one per line, nothing else. No numbers, no punctuation, just names.`

  const result = await callAI(settings.aiProvider, apiKey, resolveModel(settings), prompt)
  return result
    .split('\n')
    .map(l => l.replace(/[^a-zA-Z'-]/g, '').trim())
    .filter(n => n.length > 1)
    .slice(0, 10)
}
