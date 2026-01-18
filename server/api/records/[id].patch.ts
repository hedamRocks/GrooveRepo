/**
 * Update record (notes, DJ metadata)
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
        statusCode: 404,
        message: 'User not found'
      })
    }

    const recordId = getRouterParam(event, 'id')

    if (!recordId) {
      throw createError({
        statusCode: 400,
        message: 'Record ID required'
      })
    }

    // Verify ownership
    const existingRecord = await prisma.userRecord.findUnique({
      where: { id: recordId }
    })

    if (!existingRecord) {
      throw createError({
        statusCode: 404,
        message: 'Record not found'
      })
    }

    if (existingRecord.userId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Access denied'
      })
    }

    // Get update data
    const body = await readBody(event)

    // Only allow updating specific fields
    const updateData: any = {}
    if ('notes' in body) updateData.notes = body.notes
    if ('mediaCondition' in body) updateData.mediaCondition = body.mediaCondition
    if ('sleeveCondition' in body) updateData.sleeveCondition = body.sleeveCondition
    if ('bpm' in body) updateData.bpm = body.bpm
    if ('key' in body) updateData.key = body.key
    if ('energy' in body) updateData.energy = body.energy
    if ('tags' in body) updateData.tags = body.tags

    // Update record
    const updatedRecord = await prisma.userRecord.update({
      where: { id: recordId },
      data: updateData,
      include: {
        release: true,
        shelfPlacements: {
          include: {
            shelf: true
          }
        }
      }
    })

    return { record: updatedRecord }

  } catch (error) {
    console.error('[Record Update] Error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to update record'
    })
  }
})
