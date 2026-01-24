// Fix stuck analysis jobs
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Find all stuck jobs
  const stuckJobs = await prisma.analysisJob.findMany({
    where: {
      status: { in: ['pending', 'in_progress'] }
    }
  })

  console.log(`Found ${stuckJobs.length} stuck jobs`)

  // Mark them as failed
  for (const job of stuckJobs) {
    console.log(`Fixing job ${job.id}: ${job.status}, ${job.processed}/${job.totalTracks} tracks`)
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: 'Job was stuck and manually cleared'
      }
    })
  }

  console.log('All stuck jobs cleared!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
