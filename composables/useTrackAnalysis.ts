/**
 * Per-page track analysis with live progress (record detail + setlists).
 * Starts an analysis job, polls its status, and exposes a progress bar's worth
 * of state. Local (not shared) state so each page tracks its own job; the poll
 * interval is cleaned up on unmount and stops after repeated errors.
 */
export function useTrackAnalysis(onDone?: () => Promise<void> | void) {
  const isAnalyzing = ref(false)
  const total = ref(0)
  const processed = ref(0)
  const failed = ref(0)
  const progress = ref(0) // 0-100
  const error = ref('')

  const jobId = ref<string | null>(null)
  let interval: ReturnType<typeof setInterval> | null = null
  let pollFailures = 0

  function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
  }

  function poll() {
    stop()
    pollFailures = 0
    interval = setInterval(async () => {
      if (!jobId.value) return
      try {
        const s = await $fetch<any>(`/api/analysis/${jobId.value}`)
        pollFailures = 0
        progress.value = s.progress ?? 0
        processed.value = s.processed ?? 0
        total.value = s.totalTracks ?? total.value
        failed.value = s.failed ?? 0
        if (s.status === 'completed' || s.status === 'failed') {
          stop()
          isAnalyzing.value = false
          jobId.value = null
          if (s.status === 'completed' && onDone) await onDone()
        }
      } catch (e) {
        if (++pollFailures >= 3) {
          stop()
          isAnalyzing.value = false
        }
      }
    }, 2500)
  }

  /**
   * Start a job. `body` is the /api/analysis/start payload, e.g.
   * { trackIds: [...] } or { recordIds: [...] } or { analyzeAll: true }.
   */
  async function start(body: Record<string, any>) {
    if (isAnalyzing.value) return
    error.value = ''
    isAnalyzing.value = true
    progress.value = 0
    processed.value = 0
    failed.value = 0
    total.value = 0

    try {
      const res = await $fetch<any>('/api/analysis/start', { method: 'POST', body })
      total.value = res.totalTracks ?? 0
      if (!res.jobId || res.status === 'completed') {
        isAnalyzing.value = false
        if (onDone) await onDone()
        return
      }
      jobId.value = res.jobId
      poll()
    } catch (e: any) {
      isAnalyzing.value = false
      error.value = e?.data?.message || 'Failed to start analysis'
    }
  }

  onUnmounted(stop)

  return { isAnalyzing, total, processed, failed, progress, error, start }
}
