/**
 * Shared state for the resumable tracklist backfill, so the progress is
 * visible from anywhere (nav indicator + collection banner) off a single
 * poller. Uses useState so all components share one source of truth.
 */

// Module-level so the poll interval is a true singleton across the app and
// survives route changes (progress keeps updating in the nav as you navigate).
let pollInterval: ReturnType<typeof setInterval> | null = null

export function useTracklistBackfill() {
  const missing = useState<number>('tlb-missing', () => 0)
  const job = useState<any>('tlb-job', () => null)
  const starting = useState<boolean>('tlb-starting', () => false)

  const running = computed(
    () => job.value?.status === 'pending' || job.value?.status === 'in_progress'
  )
  const total = computed(() => job.value?.totalItems || missing.value || 0)
  const done = computed(() => job.value?.processedItems || 0)
  const percent = computed(() =>
    total.value > 0 ? Math.min(100, Math.round((done.value / total.value) * 100)) : 0
  )

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  function startPolling() {
    if (!import.meta.client || pollInterval) return
    pollInterval = setInterval(async () => {
      try {
        const res = await $fetch<{ missing: number; job: any }>('/api/import/backfill-tracklists')
        missing.value = res.missing
        job.value = res.job
        const stillRunning = res.job?.status === 'pending' || res.job?.status === 'in_progress'
        if (!stillRunning) stopPolling()
      } catch (e) {
        stopPolling()
      }
    }, 2000)
  }

  async function loadStatus() {
    try {
      const res = await $fetch<{ missing: number; job: any }>('/api/import/backfill-tracklists')
      missing.value = res.missing
      job.value = res.job
      if (running.value) startPolling()
    } catch (e) {
      // non-fatal — indicator/banner just won't show
    }
  }

  async function start() {
    if (starting.value || running.value) return
    starting.value = true
    try {
      const res = await $fetch<{ jobId: string | null; total: number; status: string; processed?: number }>(
        '/api/import/backfill-tracklists',
        { method: 'POST' }
      )
      if (res.jobId) {
        job.value = {
          id: res.jobId,
          status: res.status,
          totalItems: res.total,
          processedItems: res.processed || 0,
          failedItems: 0,
        }
        startPolling()
      } else {
        missing.value = 0
      }
    } catch (e) {
      console.error('Failed to start backfill:', e)
    } finally {
      starting.value = false
    }
  }

  return { missing, job, running, total, done, percent, starting, loadStatus, start }
}
