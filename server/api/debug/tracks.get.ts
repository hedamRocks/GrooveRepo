/**
 * Debug endpoint to get track YouTube IDs
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const recordId = query.recordId as string

  if (!recordId) {
    return { error: 'recordId required' }
  }

  const tracks = await prisma.track.findMany({
    where: { userRecordId: recordId },
    select: {
      position: true,
      title: true,
      youtubeId: true,
      youtubeTitle: true,
      bpm: true,
      key: true,
      energy: true
    },
    orderBy: { position: 'asc' }
  })

  return { tracks }
})
