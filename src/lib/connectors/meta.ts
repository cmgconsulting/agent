/**
 * Meta (Facebook + Instagram) API integration
 * Used by Eva for social media management
 */

interface MetaPostPayload {
  message: string
  link?: string
  imageUrl?: string
  pageId: string
  accessToken: string
}

interface MetaComment {
  id: string
  message: string
  from: { name: string; id: string }
  created_time: string
}

interface MetaPostInsight {
  name: string
  period: string
  values: { value: number }[]
}

// ===== Publishing =====

export async function publishFacebookPost(payload: MetaPostPayload): Promise<{ id: string }> {
  const { pageId, accessToken, message, link, imageUrl } = payload

  let endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`
  const body: Record<string, string> = { message, access_token: accessToken }

  if (imageUrl) {
    endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`
    body.url = imageUrl
    body.caption = message
  } else if (link) {
    body.link = link
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Meta API error: ${err.error?.message || res.status}`)
  }

  return res.json()
}

export async function publishInstagramPost(params: {
  igUserId: string
  accessToken: string
  imageUrl: string
  caption: string
}): Promise<{ id: string }> {
  const { igUserId, accessToken, imageUrl, caption } = params

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  )

  if (!containerRes.ok) {
    const err = await containerRes.json()
    throw new Error(`Instagram container error: ${err.error?.message || containerRes.status}`)
  }

  const { id: containerId } = await containerRes.json()

  // Step 2: Publish the container
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  )

  if (!publishRes.ok) {
    const err = await publishRes.json()
    throw new Error(`Instagram publish error: ${err.error?.message || publishRes.status}`)
  }

  return publishRes.json()
}

// ===== Comments =====

export async function getPostComments(params: {
  postId: string
  accessToken: string
  limit?: number
}): Promise<MetaComment[]> {
  const { postId, accessToken, limit = 25 } = params

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${postId}/comments?fields=id,message,from,created_time&limit=${limit}&access_token=${accessToken}`
  )

  if (!res.ok) throw new Error(`Meta comments error: ${res.status}`)

  const data = await res.json()
  return data.data || []
}

export async function replyToComment(params: {
  commentId: string
  message: string
  accessToken: string
}): Promise<{ id: string }> {
  const { commentId, message, accessToken } = params

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${commentId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: accessToken }),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Meta reply error: ${err.error?.message || res.status}`)
  }

  return res.json()
}

// ===== Insights =====

export async function getPostInsights(params: {
  postId: string
  accessToken: string
  metrics?: string[]
}): Promise<MetaPostInsight[]> {
  const { postId, accessToken } = params
  const metrics = params.metrics || ['post_impressions', 'post_engaged_users', 'post_clicks']

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${postId}/insights?metric=${metrics.join(',')}&access_token=${accessToken}`
  )

  if (!res.ok) throw new Error(`Meta insights error: ${res.status}`)

  const data = await res.json()
  return data.data || []
}

export async function getPageInsights(params: {
  pageId: string
  accessToken: string
  period?: string
}): Promise<MetaPostInsight[]> {
  const { pageId, accessToken, period = 'week' } = params
  const metrics = ['page_impressions', 'page_engaged_users', 'page_fans']

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/insights?metric=${metrics.join(',')}&period=${period}&access_token=${accessToken}`
  )

  if (!res.ok) throw new Error(`Meta page insights error: ${res.status}`)

  const data = await res.json()
  return data.data || []
}

// ===== Pages =====

export async function getPages(accessToken: string): Promise<{ id: string; name: string; access_token: string }[]> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
  )

  if (!res.ok) throw new Error(`Meta pages error: ${res.status}`)

  const data = await res.json()
  return data.data || []
}

export async function getInstagramBusinessAccount(params: {
  pageId: string
  accessToken: string
}): Promise<string | null> {
  const { pageId, accessToken } = params

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
  )

  if (!res.ok) return null

  const data = await res.json()
  return data.instagram_business_account?.id || null
}
