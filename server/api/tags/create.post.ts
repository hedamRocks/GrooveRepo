/**
 * Create a new tag
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

    const body = await readBody(event)
    const { name, color, description } = body

    if (!name || name.trim().length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Tag name required'
      })
    }

    // Check if tag name already exists for this user
    const existing = await prisma.tag.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name: name.trim()
        }
      }
    })

    if (existing) {
      throw createError({
        statusCode: 400,
        message: 'Tag with this name already exists'
      })
    }

    const tag = await prisma.tag.create({
      data: {
        userId: user.id,
        name: name.trim(),
        color: color?.trim() || null,
        description: description?.trim() || null,
      }
    })

    console.log(`[Tags] Created tag: ${tag.name} (${tag.id})`)

    return {
      success: true,
      tag: {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        createdAt: tag.createdAt,
      }
    }

  } catch (error) {
    console.error('[Tags] Create error:', error)
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to create tag'
    })
  }
})
