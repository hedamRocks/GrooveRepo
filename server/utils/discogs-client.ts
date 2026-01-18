import { OAuth } from 'oauth'

/**
 * Rate-limited Discogs API client
 * Handles OAuth authentication and enforces safe rate limiting
 * Discogs allows 60 req/min for authenticated users
 */

interface DiscogsCollectionItem {
  id: number
  instance_id: number
  date_added: string
  rating: number
  basic_information: {
    id: number
    master_id?: number
    master_url?: string
    resource_url?: string
    title: string
    year?: number
    artists?: Array<{ name: string }>
    labels?: Array<{ name: string; catno?: string }>
    genres?: string[]
    styles?: string[]
    thumb?: string
    cover_image?: string
    formats?: Array<{
      name: string
      qty: string
      descriptions?: string[]
    }>
    // Community data
    community?: {
      have: number
      want: number
    }
  }
  // User-specific collection data
  notes?: Array<{ field_id: number; value: string }>
  // Discogs stores condition in notes with field_id 1 (media) and 2 (sleeve)
  // But also provides direct fields:
  media_condition?: string
  sleeve_condition?: string
}

interface DiscogsCollectionResponse {
  pagination: {
    pages: number
    page: number
    per_page: number
    items: number
  }
  releases: DiscogsCollectionItem[]
}

interface DiscogsRelease {
  id: number
  master_id?: number
  title: string
  year?: number
  artists?: Array<{ name: string }>
  labels?: Array<{ name: string; catno?: string }>
  genres?: string[]
  styles?: string[]
  thumb?: string
  images?: Array<{ uri: string; type: string }>
  tracklist?: any[]
  // Store full response for future use
  [key: string]: any
}

class DiscogsClient {
  private oauth: OAuth
  private lastRequestTime: number = 0
  private readonly minRequestInterval = 1000 // 1 second between requests (60/min)

  constructor() {
    const config = useRuntimeConfig()

    this.oauth = new OAuth(
      'https://api.discogs.com/oauth/request_token',
      'https://api.discogs.com/oauth/access_token',
      config.discogsConsumerKey,
      config.discogsConsumerSecret,
      '1.0',
      config.discogsCallbackUrl,
      'PLAINTEXT'
    )
  }

  /**
   * Enforces rate limiting by waiting if necessary
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
  }

  /**
   * Make authenticated request to Discogs API
   */
  private async request<T>(
    url: string,
    accessToken: string,
    accessTokenSecret: string
  ): Promise<T> {
    await this.rateLimit()

    return new Promise((resolve, reject) => {
      this.oauth.get(
        url,
        accessToken,
        accessTokenSecret,
        (error, data) => {
          if (error) {
            console.error('[Discogs API Error]', error)
            reject(new Error(`Discogs API error: ${error.statusCode || 'Unknown'}`))
            return
          }

          try {
            const parsed = JSON.parse(data as string)
            resolve(parsed as T)
          } catch (parseError) {
            reject(new Error('Failed to parse Discogs response'))
          }
        }
      )
    })
  }

  /**
   * Get OAuth request token (step 1 of OAuth flow)
   */
  async getRequestToken(): Promise<{ token: string; secret: string; authorizeUrl: string }> {
    return new Promise((resolve, reject) => {
      this.oauth.getOAuthRequestToken((error, token, secret) => {
        if (error) {
          console.error('[Discogs OAuth Error]', error)
          reject(new Error('Failed to get request token'))
          return
        }

        resolve({
          token,
          secret,
          authorizeUrl: `https://www.discogs.com/oauth/authorize?oauth_token=${token}`
        })
      })
    })
  }

  /**
   * Exchange request token for access token (step 3 of OAuth flow)
   */
  async getAccessToken(
    requestToken: string,
    requestTokenSecret: string,
    verifier: string
  ): Promise<{ token: string; secret: string }> {
    return new Promise((resolve, reject) => {
      this.oauth.getOAuthAccessToken(
        requestToken,
        requestTokenSecret,
        verifier,
        (error, token, secret) => {
          if (error) {
            console.error('[Discogs OAuth Error]', error)
            reject(new Error('Failed to get access token'))
            return
          }

          resolve({ token, secret })
        }
      )
    })
  }

  /**
   * Get authenticated user's identity
   */
  async getIdentity(accessToken: string, accessTokenSecret: string): Promise<{ username: string }> {
    return this.request<{ username: string }>(
      'https://api.discogs.com/oauth/identity',
      accessToken,
      accessTokenSecret
    )
  }

  /**
   * Fetch user's collection (paginated)
   */
  async getCollection(
    username: string,
    accessToken: string,
    accessTokenSecret: string,
    page: number = 1,
    perPage: number = 100
  ): Promise<DiscogsCollectionResponse> {
    const url = `https://api.discogs.com/users/${username}/collection/folders/0/releases?page=${page}&per_page=${perPage}`
    return this.request<DiscogsCollectionResponse>(url, accessToken, accessTokenSecret)
  }

  /**
   * Get detailed release information
   */
  async getRelease(
    releaseId: number,
    accessToken: string,
    accessTokenSecret: string
  ): Promise<DiscogsRelease> {
    const url = `https://api.discogs.com/releases/${releaseId}`
    return this.request<DiscogsRelease>(url, accessToken, accessTokenSecret)
  }

  /**
   * Search for releases (for manual add feature)
   */
  async searchReleases(
    query: string,
    accessToken: string,
    accessTokenSecret: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<any> {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://api.discogs.com/database/search?q=${encodedQuery}&type=release&page=${page}&per_page=${perPage}`
    return this.request(url, accessToken, accessTokenSecret)
  }

  /**
   * Get master release information
   */
  async getMasterRelease(
    masterId: number,
    accessToken: string,
    accessTokenSecret: string
  ): Promise<any> {
    const url = `https://api.discogs.com/masters/${masterId}`
    return this.request(url, accessToken, accessTokenSecret)
  }

  /**
   * Get all versions of a master release
   */
  async getMasterVersions(
    masterId: number,
    accessToken: string,
    accessTokenSecret: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<any> {
    const url = `https://api.discogs.com/masters/${masterId}/versions?page=${page}&per_page=${perPage}`
    return this.request(url, accessToken, accessTokenSecret)
  }
}

// Singleton instance
let discogsClientInstance: DiscogsClient | null = null

export function getDiscogsClient(): DiscogsClient {
  if (!discogsClientInstance) {
    discogsClientInstance = new DiscogsClient()
  }
  return discogsClientInstance
}

export type { DiscogsCollectionItem, DiscogsCollectionResponse, DiscogsRelease }
