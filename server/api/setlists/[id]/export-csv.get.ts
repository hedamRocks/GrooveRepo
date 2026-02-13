/**
 * Export setlist to CSV format (Google Sheets compatible)
 */

export default defineEventHandler(async (event) => {
  try {
    const userEmail = getCookie(event, 'user_email')
    if (!userEmail) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required'
      })
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'User not found'
      })
    }

    const setlistId = getRouterParam(event, 'id')
    if (!setlistId) {
      throw createError({
        statusCode: 400,
        message: 'Setlist ID required'
      })
    }

    // Fetch setlist with all related data
    const setlist = await prisma.setlist.findFirst({
      where: {
        id: setlistId,
        userId: user.id
      },
      include: {
        tracks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            track: {
              include: {
                userRecord: {
                  include: {
                    release: true
                  }
                },
                trackTags: {
                  include: {
                    tag: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!setlist) {
      throw createError({
        statusCode: 404,
        message: 'Setlist not found'
      })
    }

    // Helper function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      // If contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Build CSV content
    const headers = [
      '#',
      'Position',
      'Artist',
      'Title',
      'BPM',
      'Country',
      'Label',
      'Year',
      'Tags',
      'Notes'
    ]

    const rows = setlist.tracks.map((st, index) => {
      const track = st.track
      const release = track.userRecord?.release
      const tags = track.trackTags.map(tt => tt.tag.name).join(', ')
      const bpm = st.manualBpm || track.bpm || ''

      return [
        index + 1,
        track.position,
        track.artist,
        track.title,
        bpm,
        release?.country || '',
        release?.label || '',
        release?.year || '',
        tags,
        st.notes || ''
      ]
    })

    // Generate CSV
    const csvLines = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ]

    const csvContent = csvLines.join('\n')

    // Set response headers for file download
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="${setlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_setlist.csv"`)

    // Add BOM for proper Excel/Sheets encoding
    return '\uFEFF' + csvContent

  } catch (error) {
    console.error('[Setlist Export CSV] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to export setlist'
    })
  }
})
