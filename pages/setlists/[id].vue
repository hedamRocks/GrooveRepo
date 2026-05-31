<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-24">
      <div class="w-12 h-12 relative">
        <div class="absolute inset-0 rounded-full border-2 border-white/10"></div>
        <div class="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style="border-top-color: var(--accent);"></div>
      </div>
    </div>

    <!-- Setlist Content -->
    <div v-else-if="setlist">
      <!-- Header -->
      <div class="flex items-center justify-between gap-3 py-6">
        <div class="flex items-center gap-3 min-w-0">
          <NuxtLink to="/setlists" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06] shrink-0" style="color: var(--text-secondary);">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </NuxtLink>
          <div class="min-w-0">
            <p class="eyebrow mb-0.5">Setlist</p>
            <h1 class="display text-2xl sm:text-3xl truncate">{{ setlist.name }}</h1>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <button
            v-if="setlist.tracks.length > 0"
            @click="analyzeAllSetlistTracks"
            :disabled="isAnalyzingSetlist"
            class="btn-secondary !py-2 !px-3.5 text-sm disabled:opacity-60"
            title="Analyze BPM / key / energy for all tracks"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span class="hidden sm:inline">{{ isAnalyzingSetlist ? 'Analyzing…' : 'Analyze' }}</span>
          </button>
          <button @click="exportToCSV" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-all" style="color: var(--text-secondary);" title="Export to CSV">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button @click="showEditModal = true" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-all" style="color: var(--text-secondary);" title="Edit setlist">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Analysis progress -->
      <div v-if="isAnalyzingSetlist" class="surface-2 px-3 py-2.5 mb-4">
        <div class="flex items-center justify-between text-[11px] font-mono mb-1.5" style="color: var(--text-secondary);">
          <span>Analyzing {{ analysisProcessed }} / {{ analysisTotal || '…' }} tracks<span v-if="analysisFailed"> · {{ analysisFailed }} failed</span></span>
          <span class="font-semibold" style="color: var(--accent);">{{ analysisProgress }}%</span>
        </div>
        <div class="w-full h-1.5 rounded-full overflow-hidden" style="background: var(--bg-secondary);">
          <div class="h-full rounded-full transition-all duration-500" style="background: var(--accent);" :style="{ width: `${analysisProgress}%` }"></div>
        </div>
      </div>
      <p v-if="analysisError" class="text-xs mb-4" style="color: #ff6b6b;">{{ analysisError }}</p>

      <!-- Filters -->
      <div v-if="setlist.tracks.length > 0" class="space-y-2 mb-4">
        <div class="flex items-center gap-2 overflow-x-auto pb-2 filter-options">
          <!-- Sort -->
          <div class="relative flex-shrink-0">
            <select v-model="sortValue" @change="handleSortChange($event)" class="input pl-3 pr-8 py-2 text-xs !rounded-full appearance-none cursor-pointer">
              <option value="added-desc">Date added (newest)</option>
              <option value="added-asc">Date added (oldest)</option>
              <option value="title-asc">Title (A–Z)</option>
              <option value="title-desc">Title (Z–A)</option>
              <option value="artist-asc">Artist (A–Z)</option>
              <option value="artist-desc">Artist (Z–A)</option>
              <option value="bpm-asc">BPM (low–high)</option>
              <option value="bpm-desc">BPM (high–low)</option>
            </select>
            <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style="color: var(--text-tertiary);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <!-- Country Filter -->
          <div class="relative flex-shrink-0">
            <select v-model="selectedCountry" class="input pl-3 pr-8 py-2 text-xs !rounded-full appearance-none cursor-pointer">
              <option value="">All countries</option>
              <option v-for="country in availableCountries" :key="country" :value="country">{{ country }}</option>
            </select>
            <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style="color: var(--text-tertiary);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <!-- Tag Filter Button -->
          <button @click="showTagFilterModal = true" class="chip flex-shrink-0 !py-2" :class="selectedTagIds.length ? 'chip-active' : ''">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>{{ selectedTagIds.length === 0 ? 'Tags' : `${selectedTagIds.length} tags` }}</span>
          </button>

          <!-- Tag Operator Toggle -->
          <div v-if="selectedTagIds.length > 1" class="flex-shrink-0 flex rounded-full overflow-hidden" style="border: 1px solid var(--border-subtle);">
            <button @click="tagFilterOperator = 'AND'" class="px-3 py-1.5 text-xs font-medium transition-colors" :style="tagFilterOperator === 'AND' ? 'background: var(--accent); color: #fff;' : 'color: var(--text-secondary);'">ALL</button>
            <button @click="tagFilterOperator = 'OR'" class="px-3 py-1.5 text-xs font-medium transition-colors" :style="tagFilterOperator === 'OR' ? 'background: var(--accent); color: #fff;' : 'color: var(--text-secondary);'">ANY</button>
          </div>

          <!-- Clear Filters -->
          <button v-if="selectedCountry || selectedTagIds.length > 0" @click="clearFilters" class="btn-ghost flex-shrink-0 text-xs">Clear</button>
        </div>

        <div v-if="filteredTracks.length !== setlist.tracks.length" class="text-xs" style="color: var(--text-tertiary);">
          Showing {{ filteredTracks.length }} of {{ setlist.tracks.length }} tracks
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="setlist.tracks.length === 0" class="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div class="w-20 h-20 surface rounded-2xl flex items-center justify-center mb-5">
          <svg class="w-9 h-9" style="color: var(--accent);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h3 class="display text-2xl mb-2">No tracks yet</h3>
        <p class="text-sm mb-6 max-w-xs" style="color: var(--text-secondary);">Start building your setlist by adding tracks from your collection.</p>
        <button @click="showAddTrackModal = true" class="btn-primary inline-flex">Add your first track</button>
      </div>

      <!-- Tracks List -->
      <div v-else class="pb-28 space-y-2.5">
        <div
          v-for="(setlistTrack, index) in filteredTracks"
          :key="setlistTrack.id"
          class="group relative surface glass-hover overflow-hidden"
        >
          <div class="flex gap-3 p-3">
            <!-- Album Cover -->
            <div class="relative flex-shrink-0">
              <img
                v-if="setlistTrack.track.userRecord?.release?.thumbUrl"
                :src="setlistTrack.track.userRecord.release.thumbUrl"
                :alt="`${setlistTrack.track.title} cover`"
                class="w-16 h-16 rounded-lg object-cover"
              />
              <div v-else class="w-16 h-16 rounded-lg flex items-center justify-center" style="background: var(--bg-tertiary);">
                <svg class="w-7 h-7" style="color: var(--text-tertiary);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div class="absolute -top-1.5 -left-1.5 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style="background: var(--accent);">
                {{ index + 1 }}
              </div>
            </div>

            <!-- Track Info -->
            <div class="flex-1 min-w-0">
              <div class="mb-2">
                <h3 class="text-sm font-semibold truncate mb-0.5" style="color: var(--text-primary);">{{ setlistTrack.track.title }}</h3>
                <p class="text-xs truncate" style="color: var(--text-secondary);">{{ setlistTrack.track.artist }}</p>
              </div>

              <div class="flex flex-wrap gap-1.5 items-center">
                <span class="chip !py-0.5 !px-2 font-mono uppercase !text-[10px]">{{ setlistTrack.track.position }}</span>
                <button @click="openBpmModal(setlistTrack)" class="chip chip-active !py-0.5 !px-2 font-mono !text-[10px]" title="Tap to set BPM">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {{ setlistTrack.manualBpm || setlistTrack.track.bpm || '—' }}
                </button>
                <!-- One-tap octave fix (the common half/double-time error) -->
                <template v-if="setlistTrack.manualBpm || setlistTrack.track.bpm">
                  <button @click.stop="quickOctave(setlistTrack, 0.5)" class="chip !py-0.5 !px-1.5 font-mono !text-[10px]" title="Halve BPM">÷2</button>
                  <button @click.stop="quickOctave(setlistTrack, 2)" class="chip !py-0.5 !px-1.5 font-mono !text-[10px]" title="Double BPM">×2</button>
                </template>
                <span v-if="setlistTrack.track.key" class="chip !py-0.5 !px-2 font-mono !text-[10px]" title="Detected key">{{ setlistTrack.track.key }}</span>
                <span
                  v-if="setlistTrack.track.needsReview"
                  class="chip !py-0.5 !px-2 !text-[10px] inline-flex items-center gap-1"
                  style="border-color: var(--accent); color: var(--accent);"
                  title="Low-confidence analysis — verify BPM/key"
                >
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  verify
                </span>
                <span v-if="setlistTrack.track.userRecord?.release?.country" class="chip !py-0.5 !px-2 !text-[10px]">{{ setlistTrack.track.userRecord.release.country }}</span>
              </div>

              <!-- Tags -->
              <div class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="trackTag in setlistTrack.track.trackTags.slice(0, 3)"
                  :key="trackTag.id"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full"
                  style="border: 1px solid var(--border-subtle); background: var(--bg-tertiary); color: var(--text-primary);"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: trackTag.tag.color || '#ff4d3d' }"></span>
                  {{ trackTag.tag.name }}
                </span>
                <button v-if="setlistTrack.track.trackTags.length > 3" @click="openTagModal(setlistTrack.track)" class="chip !py-0.5 !px-1.5 !text-[10px]">
                  +{{ setlistTrack.track.trackTags.length - 3 }}
                </button>
                <button v-if="setlistTrack.track.trackTags.length === 0" @click="openTagModal(setlistTrack.track)" class="chip !py-0.5 !px-1.5 !text-[10px]">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M12 4v16m8-8H4" /></svg>
                  Add tag
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-0.5 flex-shrink-0">
              <button @click="openTagModal(setlistTrack.track)" class="icon-btn p-2 rounded-lg" title="Manage tags" aria-label="Manage tags">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </button>
              <a :href="getYoutubeSearchUrl(setlistTrack.track.artist, setlistTrack.track.title)" target="_blank" rel="noopener noreferrer" class="icon-danger p-2 rounded-lg" title="Search on YouTube" aria-label="Search on YouTube">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <button @click="openRemoveModal(setlistTrack)" class="icon-danger p-2 rounded-lg" title="Remove track" aria-label="Remove track">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Fixed Add Track Button -->
      <div class="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none" style="background: linear-gradient(to top, #0b0b0c 30%, transparent);">
        <div class="max-w-5xl mx-auto pointer-events-auto px-2 sm:px-4">
          <button @click="showAddTrackModal = true" class="btn-primary w-full text-base">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M12 5v14M5 12h14" /></svg>
            Add track
          </button>
        </div>
      </div>
    </div>

    <!-- Add Track Modal -->
    <Teleport to="body">
      <div v-if="showAddTrackModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] overflow-y-auto p-4" @click="showAddTrackModal = false">
        <div class="surface max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto scale-in" style="box-shadow: var(--shadow-lg);" @click.stop>
          <div class="p-6">
            <h2 class="display text-2xl mb-5">Add track</h2>

            <!-- Tab Selector -->
            <div class="flex gap-1 p-1 mb-5 rounded-full" style="background: var(--bg-tertiary);">
              <button @click="addTrackMode = 'collection'" class="flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors" :style="addTrackMode === 'collection' ? 'background: var(--accent); color: #fff;' : 'color: var(--text-secondary);'">From collection</button>
              <button @click="addTrackMode = 'discogs'" class="flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors" :style="addTrackMode === 'discogs' ? 'background: var(--accent); color: #fff;' : 'color: var(--text-secondary);'">From Discogs</button>
            </div>

            <!-- Collection Search Mode -->
            <div v-if="addTrackMode === 'collection'">
              <div class="mb-4">
                <input v-model="trackSearchQuery" type="text" placeholder="Search your collection…" class="input w-full px-4 py-2.5" @input="searchTracks" />
              </div>

              <div v-if="isSearchingTracks" class="text-center py-8">
                <div class="w-8 h-8 border-2 rounded-full animate-spin mx-auto" style="border-color: var(--accent); border-top-color: transparent;"></div>
              </div>

              <div v-else-if="availableTracks.length === 0" class="text-center py-8">
                <p class="mb-4" style="color: var(--text-secondary);">No tracks found in your collection</p>
                <button @click="addTrackMode = 'discogs'" class="btn-primary !py-2 !px-4 text-sm">Search Discogs</button>
              </div>

              <div v-else class="space-y-1 max-h-96 overflow-y-auto">
                <div v-for="track in availableTracks" :key="track.id" class="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-white/[0.04]">
                  <img v-if="track.userRecord?.release?.thumbUrl" :src="track.userRecord.release.thumbUrl" :alt="`${track.title} cover`" class="w-12 h-12 rounded-lg object-cover cursor-pointer" @click="addTrackToSetlist(track)" />
                  <div v-else class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer" style="background: var(--bg-tertiary);" @click="addTrackToSetlist(track)">
                    <svg class="w-6 h-6" style="color: var(--text-tertiary);" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                  </div>
                  <div class="flex-1 min-w-0 cursor-pointer" @click="addTrackToSetlist(track)">
                    <h4 class="font-medium truncate text-sm" style="color: var(--text-primary);">{{ track.title }}</h4>
                    <p class="text-xs truncate" style="color: var(--text-secondary);">{{ track.artist }}</p>
                  </div>
                  <div v-if="track.bpm" class="text-xs font-mono" style="color: var(--text-tertiary);">{{ track.bpm }} BPM</div>
                  <a :href="getYoutubeSearchUrl(track.artist, track.title)" target="_blank" rel="noopener noreferrer" class="icon-danger p-2 flex-shrink-0" title="Search on YouTube" aria-label="Search on YouTube" @click.stop>
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                </div>
              </div>
            </div>

            <!-- Discogs Search Mode -->
            <div v-else-if="addTrackMode === 'discogs'">
              <div class="mb-4">
                <input v-model="discogsSearchQuery" type="text" placeholder="Search Discogs…" class="input w-full px-4 py-2.5" />
              </div>

              <div v-if="isSearchingDiscogs" class="text-center py-8">
                <div class="w-8 h-8 border-2 rounded-full animate-spin mx-auto" style="border-color: var(--accent); border-top-color: transparent;"></div>
                <p class="text-sm mt-2" style="color: var(--text-secondary);">Searching Discogs…</p>
              </div>

              <div v-else-if="discogsSearchResults.length > 0" class="space-y-2 max-h-96 overflow-y-auto">
                <div v-for="result in discogsSearchResults" :key="result.id" class="surface-2 overflow-hidden">
                  <div class="p-3 flex gap-3">
                    <div class="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden" style="background: var(--bg-secondary);">
                      <img v-if="result.cover_image || result.thumb" :src="result.thumb || result.cover_image" :alt="result.title" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <h4 class="font-medium text-sm truncate" style="color: var(--text-primary);">{{ result.title }}</h4>
                      <p class="text-xs" style="color: var(--text-secondary);">{{ result.year || 'Year unknown' }}</p>
                      <p v-if="result.format?.length" class="text-xs mt-1" style="color: var(--accent);">{{ result.format.join(', ') }}</p>
                    </div>
                    <button @click="addRecordFromDiscogs(result.id)" :disabled="isAddingRecord && addingDiscogsId === result.id" class="btn-primary !py-1.5 !px-4 text-sm flex-shrink-0 self-center">
                      {{ isAddingRecord && addingDiscogsId === result.id ? 'Adding…' : 'Add' }}
                    </button>
                  </div>
                </div>
              </div>

              <div v-else-if="discogsSearchQuery && !isSearchingDiscogs" class="text-center py-8">
                <p style="color: var(--text-secondary);">No results found on Discogs</p>
              </div>

              <div v-else class="text-center py-8">
                <p style="color: var(--text-secondary);">Search Discogs to add a new record</p>
              </div>
            </div>

            <div class="flex justify-end mt-5">
              <button @click="showAddTrackModal = false" class="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- BPM Modal -->
    <Teleport to="body">
      <div v-if="showBpmModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click="showBpmModal = false">
        <div class="surface max-w-lg w-full scale-in" style="box-shadow: var(--shadow-lg);" @click.stop>
          <div class="p-6">
            <div class="flex items-start justify-between mb-5">
              <div>
                <h2 class="display text-2xl">Set BPM</h2>
                <p class="text-sm mt-1" style="color: var(--text-secondary);">{{ selectedTrack?.track.title }}</p>
                <p class="text-xs font-mono" style="color: var(--text-tertiary);">Original BPM: {{ selectedTrack?.track.bpm || 'Unknown' }}</p>
              </div>
              <button @click="showBpmModal = false" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06]" style="color: var(--text-secondary);">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <BpmTapper @bpm-selected="handleBpmSelected" />
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Remove Track Confirmation -->
    <Teleport to="body">
      <div v-if="showRemoveModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click="showRemoveModal = false">
        <div class="surface max-w-md w-full p-6 scale-in" style="box-shadow: var(--shadow-lg);" @click.stop>
          <h2 class="display text-2xl mb-3">Remove track</h2>
          <p class="mb-6" style="color: var(--text-secondary);">Remove "<span style="color: var(--text-primary);">{{ trackToRemove?.track.title }}</span>" from this setlist?</p>
          <div class="flex justify-end gap-3">
            <button @click="showRemoveModal = false" class="btn-secondary">Cancel</button>
            <button @click="removeTrack" class="btn-primary" style="background: #e23b2c;">Remove</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Setlist Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click="showEditModal = false">
        <div class="surface max-w-md w-full p-6 scale-in" style="box-shadow: var(--shadow-lg);" @click.stop>
          <h2 class="display text-2xl mb-5">Edit setlist</h2>

          <form @submit.prevent="updateSetlist" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Name *</label>
              <input v-model="editForm.name" type="text" required class="input w-full px-4 py-3" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Description</label>
              <textarea v-model="editForm.description" rows="2" class="input w-full px-4 py-3 resize-none"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Venue</label>
                <input v-model="editForm.venue" type="text" class="input w-full px-4 py-3" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Date</label>
                <input v-model="editForm.date" type="date" class="input w-full px-4 py-3" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">Duration (minutes)</label>
              <input v-model.number="editForm.duration" type="number" min="1" class="input w-full px-4 py-3" />
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="showEditModal = false" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary">Save changes</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Tag Filter Modal -->
    <Teleport to="body">
      <div v-if="showTagFilterModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click="showTagFilterModal = false">
        <div class="surface max-w-md w-full p-6 scale-in" style="box-shadow: var(--shadow-lg);" @click.stop>
          <div class="flex items-center justify-between mb-5">
            <h3 class="display text-xl">Filter by tags</h3>
            <button @click="showTagFilterModal = false" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06]" style="color: var(--text-secondary);">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div v-if="availableTags.length === 0" class="text-sm py-8 text-center" style="color: var(--text-tertiary);">No tags available.</div>

          <div v-else class="space-y-1.5 max-h-96 overflow-y-auto">
            <button v-for="tag in availableTags" :key="tag.id" @click="toggleTagFilter(tag.id)" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left" :class="selectedTagIds.includes(tag.id) ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]' : 'hover:bg-white/[0.04]'">
              <span class="w-4 h-4 rounded-md flex-shrink-0" :style="{ backgroundColor: tag.color || '#ff4d3d' }"></span>
              <span class="text-sm flex-1" style="color: var(--text-primary);">{{ tag.name }}</span>
              <svg v-if="selectedTagIds.includes(tag.id)" class="w-5 h-5" style="color: var(--accent);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
            </button>
          </div>

          <div class="mt-6 flex gap-3">
            <button v-if="selectedTagIds.length > 0" @click="clearTagFilter" class="btn-secondary flex-1">Clear</button>
            <button @click="showTagFilterModal = false" class="btn-primary flex-1">Done</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Tag Management Modal -->
    <Teleport to="body">
      <div v-if="showTagManagementModal && selectedTrackForTags" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click="showTagManagementModal = false">
        <div class="surface max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col scale-in" style="box-shadow: var(--shadow-lg);" @click.stop>
          <div class="p-5" style="border-bottom: 1px solid var(--border-subtle);">
            <div class="flex items-center justify-between mb-1">
              <h2 class="display text-xl">Manage tags</h2>
              <button @click="showTagManagementModal = false" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06]" style="color: var(--text-secondary);">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p class="text-sm truncate" style="color: var(--text-secondary);">{{ selectedTrackForTags.artist }} — {{ selectedTrackForTags.title }}</p>
          </div>

          <div class="flex-1 overflow-y-auto p-5">
            <div v-if="!showCreateTagForm && !isLoadingTags" class="mb-4">
              <button @click="showCreateTagForm = true" class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors" style="border: 1px dashed var(--border-strong); color: var(--text-secondary);">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M12 4v16m8-8H4" /></svg>
                Create new tag
              </button>
            </div>

            <div v-if="showCreateTagForm" class="mb-4 p-4 surface-2">
              <form @submit.prevent="createNewTag" class="space-y-3">
                <input v-model="newTagName" type="text" placeholder="Tag name" required class="input w-full px-3 py-2 text-sm" />
                <div class="flex flex-wrap gap-2">
                  <div v-for="color in tagColorPresets" :key="color" @click="newTagColor = color" class="w-8 h-8 rounded-lg cursor-pointer transition-transform hover:scale-110" :class="{ 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-tertiary)]': newTagColor === color }" :style="{ backgroundColor: color }"></div>
                </div>
                <div class="flex gap-2">
                  <button type="button" @click="showCreateTagForm = false; newTagName = ''; newTagColor = '#ff4d3d'" class="btn-secondary flex-1 !py-2 text-sm">Cancel</button>
                  <button type="submit" :disabled="isCreatingTag" class="btn-primary flex-1 !py-2 text-sm">{{ isCreatingTag ? 'Creating…' : 'Create' }}</button>
                </div>
              </form>
            </div>

            <div v-if="isLoadingTags" class="flex justify-center py-8">
              <div class="w-8 h-8 border-2 rounded-full animate-spin" style="border-color: var(--accent); border-top-color: transparent;"></div>
            </div>

            <div v-else-if="allUserTags.length === 0 && !showCreateTagForm" class="text-center py-8">
              <p class="text-sm" style="color: var(--text-tertiary);">No tags created yet</p>
            </div>

            <div v-else-if="allUserTags.length > 0" class="space-y-1.5">
              <button v-for="tag in allUserTags" :key="tag.id" @click="toggleTrackTag(tag.id)" class="w-full flex items-center justify-between p-3 rounded-xl transition-all" :class="isTagAssigned(tag.id) ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]' : 'surface-2 hover:bg-white/[0.04]'">
                <div class="flex items-center gap-3">
                  <span class="w-4 h-4 rounded-md flex-shrink-0" :style="{ backgroundColor: tag.color || '#ff4d3d' }"></span>
                  <span class="text-sm font-medium" style="color: var(--text-primary);">{{ tag.name }}</span>
                </div>
                <svg v-if="isTagAssigned(tag.id)" class="w-5 h-5" style="color: var(--accent);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
              </button>
            </div>
          </div>

          <div class="p-4" style="border-top: 1px solid var(--border-subtle);">
            <button @click="showTagManagementModal = false" class="btn-primary w-full">Done</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

interface Track {
  id: string
  position: string
  title: string
  artist: string
  bpm: number | null
  key?: string | null
  keyConfidence?: number | null
  needsReview?: boolean
  createdAt?: string
  userRecord?: {
    release?: {
      thumbUrl: string | null
    }
  }
  trackTags: Array<{
    id: string
    tag: {
      id: string
      name: string
      color: string | null
    }
  }>
}

interface SetlistTrack {
  id: string
  trackId: string
  sortOrder: number
  manualBpm: number | null
  notes: string | null
  addedAt: string
  track: Track
}

interface Setlist {
  id: string
  name: string
  description: string | null
  venue: string | null
  date: string | null
  duration: number | null
  tracks: SetlistTrack[]
}

const setlist = ref<Setlist | null>(null)
const isLoading = ref(true)

// Analyze all tracks in the setlist (shared composable: polling + progress)
const {
  isAnalyzing: isAnalyzingSetlist,
  total: analysisTotal,
  processed: analysisProcessed,
  failed: analysisFailed,
  progress: analysisProgress,
  error: analysisError,
  start: startAnalysis,
} = useTrackAnalysis(() => fetchSetlist())

async function analyzeAllSetlistTracks() {
  const ids = setlist.value?.tracks?.map((t) => t.track.id) || []
  if (ids.length === 0) return
  await startAnalysis({ trackIds: ids })
}

const showAddTrackModal = ref(false)
const showBpmModal = ref(false)
const showRemoveModal = ref(false)
const showEditModal = ref(false)
const showTagFilterModal = ref(false)

const availableTracks = ref<Track[]>([])
const isSearchingTracks = ref(false)
const trackSearchQuery = ref('')

// Discogs search for adding records
const addTrackMode = ref<'collection' | 'discogs'>('collection')
const discogsSearchQuery = ref('')
const discogsSearchResults = ref<any[]>([])
const isSearchingDiscogs = ref(false)
const isAddingRecord = ref(false)
const addingDiscogsId = ref<number | null>(null)

const selectedTrack = ref<SetlistTrack | null>(null)
const manualBpm = ref<number | null>(null)

const trackToRemove = ref<SetlistTrack | null>(null)

const editForm = ref({
  name: '',
  description: '',
  venue: '',
  date: '',
  duration: null as number | null,
})

const sortColumn = ref<'title' | 'artist' | 'bpm' | 'added'>('added')
const sortDirection = ref<'asc' | 'desc'>('desc')
const sortValue = ref('added-desc')

const selectedCountry = ref<string>('')
const selectedTagIds = ref<string[]>([])
const tagFilterOperator = ref<'AND' | 'OR'>('OR')

// Tag management
const showTagManagementModal = ref(false)
const selectedTrackForTags = ref<Track | null>(null)
const allUserTags = ref<Array<{ id: string; name: string; color: string | null }>>([])
const isLoadingTags = ref(false)
const showCreateTagForm = ref(false)
const newTagName = ref('')
const newTagColor = ref('#ff4d3d')
const isCreatingTag = ref(false)
const tagColorPresets = ['#ff4d3d', '#fb923c', '#fbbf24', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#6b7280']

// Get unique countries from tracks
const availableCountries = computed(() => {
  if (!setlist.value) return []
  const countries = new Set<string>()
  setlist.value.tracks.forEach(track => {
    const country = track.track.userRecord?.release?.country
    if (country) countries.add(country)
  })
  return Array.from(countries).sort()
})

// Get unique tags from tracks
const availableTags = computed(() => {
  if (!setlist.value) return []
  const tagsMap = new Map<string, { id: string; name: string }>()
  setlist.value.tracks.forEach(track => {
    track.track.trackTags.forEach(tt => {
      if (!tagsMap.has(tt.tag.id)) {
        tagsMap.set(tt.tag.id, { id: tt.tag.id, name: tt.tag.name })
      }
    })
  })
  return Array.from(tagsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
})

const sortedTracks = computed(() => {
  if (!setlist.value || !sortColumn.value) {
    return setlist.value?.tracks || []
  }

  const tracks = [...setlist.value.tracks]

  tracks.sort((a, b) => {
    let aVal: any
    let bVal: any

    switch (sortColumn.value) {
      case 'title':
        aVal = a.track.title.toLowerCase()
        bVal = b.track.title.toLowerCase()
        break
      case 'artist':
        aVal = a.track.artist.toLowerCase()
        bVal = b.track.artist.toLowerCase()
        break
      case 'bpm':
        aVal = a.manualBpm || a.track.bpm || 0
        bVal = b.manualBpm || b.track.bpm || 0
        break
      case 'added':
        // Sort by when the track was added to the setlist
        aVal = new Date(a.addedAt || 0).getTime()
        bVal = new Date(b.addedAt || 0).getTime()
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })

  return tracks
})

// Apply filters to sorted tracks
const filteredTracks = computed(() => {
  let tracks = sortedTracks.value

  // Filter by country
  if (selectedCountry.value) {
    tracks = tracks.filter(track =>
      track.track.userRecord?.release?.country === selectedCountry.value
    )
  }

  // Filter by tags
  if (selectedTagIds.value.length > 0) {
    tracks = tracks.filter(track => {
      const trackTagIds = track.track.trackTags.map(tt => tt.tag.id)

      if (tagFilterOperator.value === 'AND') {
        // ALL: Track must have all selected tags
        return selectedTagIds.value.every(tagId => trackTagIds.includes(tagId))
      } else {
        // ANY: Track must have at least one of the selected tags
        return selectedTagIds.value.some(tagId => trackTagIds.includes(tagId))
      }
    })
  }

  return tracks
})

async function fetchSetlist() {
  isLoading.value = true
  try {
    const response = await $fetch(`/api/setlists/${route.params.id}`)
    setlist.value = response.setlist
  } catch (error) {
    console.error('Failed to fetch setlist:', error)
    router.push('/setlists')
  } finally {
    isLoading.value = false
  }
}

let searchTimeout: NodeJS.Timeout | null = null

async function searchTracks() {
  if (searchTimeout) clearTimeout(searchTimeout)

  searchTimeout = setTimeout(async () => {
    isSearchingTracks.value = true
    try {
      const params = new URLSearchParams()
      if (trackSearchQuery.value.trim()) {
        params.append('search', trackSearchQuery.value.trim())
      }
      params.append('limit', '50')

      const response = await $fetch(`/api/tracks?${params}`)
      availableTracks.value = response.tracks
    } catch (error) {
      console.error('Failed to search tracks:', error)
    } finally {
      isSearchingTracks.value = false
    }
  }, 300)
}

async function addTrackToSetlist(track: Track) {
  try {
    await $fetch(`/api/setlists/${setlist.value!.id}/tracks/add`, {
      method: 'POST',
      body: { trackId: track.id }
    })

    await fetchSetlist()
    showAddTrackModal.value = false
    trackSearchQuery.value = ''
  } catch (error: any) {
    console.error('Failed to add track:', error)
    if (error.statusCode === 400) {
      alert('This track is already in the setlist')
    } else {
      alert('Failed to add track')
    }
  }
}

function openBpmModal(setlistTrack: SetlistTrack) {
  selectedTrack.value = setlistTrack
  manualBpm.value = setlistTrack.manualBpm || setlistTrack.track.bpm || null
  showBpmModal.value = true
}

async function handleBpmSelected(bpm: number) {
  manualBpm.value = bpm
  await updateBpm()
}

// One-tap octave correction (½× / 2×) — the common BPM-detection error.
async function quickOctave(setlistTrack: SetlistTrack, factor: number) {
  const current = setlistTrack.manualBpm || setlistTrack.track.bpm
  if (!current) return
  const newBpm = Math.round(current * factor)
  if (newBpm < 40 || newBpm > 300) return
  try {
    await $fetch(`/api/setlists/${setlist.value!.id}/tracks/update-bpm`, {
      method: 'POST',
      body: { trackId: setlistTrack.trackId, manualBpm: newBpm }
    })
    await fetchSetlist()
  } catch (error) {
    console.error('Failed to update BPM:', error)
  }
}

async function updateBpm() {
  if (!selectedTrack.value || !manualBpm.value) return

  try {
    await $fetch(`/api/setlists/${setlist.value!.id}/tracks/update-bpm`, {
      method: 'POST',
      body: {
        trackId: selectedTrack.value.trackId,
        manualBpm: manualBpm.value
      }
    })

    await fetchSetlist()
    showBpmModal.value = false
  } catch (error) {
    console.error('Failed to update BPM:', error)
    alert('Failed to update BPM')
  }
}

function openRemoveModal(setlistTrack: SetlistTrack) {
  trackToRemove.value = setlistTrack
  showRemoveModal.value = true
}

async function removeTrack() {
  if (!trackToRemove.value) return

  try {
    await $fetch(`/api/setlists/${setlist.value!.id}/tracks/remove`, {
      method: 'POST',
      body: { trackId: trackToRemove.value.trackId }
    })

    await fetchSetlist()
    showRemoveModal.value = false
    trackToRemove.value = null
  } catch (error) {
    console.error('Failed to remove track:', error)
    alert('Failed to remove track')
  }
}

function clearFilters() {
  selectedCountry.value = ''
  selectedTagIds.value = []
}

function toggleTagFilter(tagId: string) {
  const index = selectedTagIds.value.indexOf(tagId)
  if (index === -1) {
    selectedTagIds.value.push(tagId)
  } else {
    selectedTagIds.value.splice(index, 1)
  }
}

function clearTagFilter() {
  selectedTagIds.value = []
}

function handleSortChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (!value) {
    sortColumn.value = 'added'
    sortDirection.value = 'desc'
    sortValue.value = 'added-desc'
    return
  }

  const [column, direction] = value.split('-') as [('title' | 'artist' | 'bpm' | 'added'), ('asc' | 'desc')]
  sortColumn.value = column
  sortDirection.value = direction
  sortValue.value = value
}

function toggleSort(column: 'title' | 'artist' | 'bpm') {
  if (sortColumn.value === column) {
    // Toggle direction if same column
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // Set new column and default to ascending
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

function getYoutubeSearchUrl(artist: string, title: string): string {
  const query = `${artist} - ${title}`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

function openEditModal() {
  if (!setlist.value) return

  editForm.value = {
    name: setlist.value.name,
    description: setlist.value.description || '',
    venue: setlist.value.venue || '',
    date: setlist.value.date ? new Date(setlist.value.date).toISOString().split('T')[0] : '',
    duration: setlist.value.duration,
  }
  showEditModal.value = true
}

async function updateSetlist() {
  if (!setlist.value || !editForm.value.name.trim()) return

  try {
    const payload: any = {
      name: editForm.value.name.trim()
    }

    if (editForm.value.description?.trim()) {
      payload.description = editForm.value.description.trim()
    }
    if (editForm.value.venue?.trim()) {
      payload.venue = editForm.value.venue.trim()
    }
    if (editForm.value.date) {
      payload.date = editForm.value.date
    }
    if (editForm.value.duration && editForm.value.duration > 0) {
      payload.duration = editForm.value.duration
    }

    await $fetch(`/api/setlists/${setlist.value.id}`, {
      method: 'PATCH',
      body: payload
    })

    await fetchSetlist()
    showEditModal.value = false
  } catch (error) {
    console.error('Failed to update setlist:', error)
    alert('Failed to update setlist')
  }
}

async function exportToCSV() {
  if (!setlist.value) return

  try {
    // Create a link element and trigger download
    const url = `/api/setlists/${setlist.value.id}/export-csv`
    const link = document.createElement('a')
    link.href = url
    link.download = `${setlist.value.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_setlist.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Failed to export CSV:', error)
    alert('Failed to export setlist to CSV')
  }
}

// Tag management functions
async function loadAllTags() {
  try {
    isLoadingTags.value = true
    const response = await $fetch<{ tags: Array<{ id: string; name: string; color: string | null }> }>('/api/tags')
    allUserTags.value = response.tags
  } catch (error) {
    console.error('Failed to load tags:', error)
  } finally {
    isLoadingTags.value = false
  }
}

async function openTagModal(track: Track) {
  selectedTrackForTags.value = track
  showTagManagementModal.value = true
  await loadAllTags()
}

function isTagAssigned(tagId: string): boolean {
  if (!selectedTrackForTags.value) return false
  return selectedTrackForTags.value.trackTags.some(tt => tt.tag.id === tagId)
}

async function toggleTrackTag(tagId: string) {
  if (!selectedTrackForTags.value) return

  const trackId = selectedTrackForTags.value.id
  const isAssigned = isTagAssigned(tagId)

  try {
    if (isAssigned) {
      // Remove tag
      await $fetch(`/api/tracks/${trackId}/tags/remove`, {
        method: 'POST',
        body: { tagId }
      })
    } else {
      // Assign tag
      await $fetch(`/api/tracks/${trackId}/tags/assign`, {
        method: 'POST',
        body: { tagId }
      })
    }

    // Refresh setlist to get updated tags
    await fetchSetlist()

    // Update selected track reference
    if (setlist.value) {
      const updatedSetlistTrack = setlist.value.tracks.find(st => st.track.id === trackId)
      if (updatedSetlistTrack) {
        selectedTrackForTags.value = updatedSetlistTrack.track
      }
    }
  } catch (error) {
    console.error('Failed to toggle tag:', error)
    alert('Failed to update tag')
  }
}

async function createNewTag() {
  if (!newTagName.value.trim()) return

  try {
    isCreatingTag.value = true
    const response = await $fetch<{ tag: { id: string; name: string; color: string | null } }>('/api/tags/create', {
      method: 'POST',
      body: {
        name: newTagName.value.trim(),
        color: newTagColor.value
      }
    })

    // Add new tag to the list
    allUserTags.value.push(response.tag)

    // Reset form
    newTagName.value = ''
    newTagColor.value = '#6366F1'
    showCreateTagForm.value = false
  } catch (error) {
    console.error('Failed to create tag:', error)
    alert('Failed to create tag')
  } finally {
    isCreatingTag.value = false
  }
}

// Discogs search with debounce
let discogsSearchTimeout: ReturnType<typeof setTimeout> | null = null
watch(discogsSearchQuery, (newValue) => {
  if (discogsSearchTimeout) clearTimeout(discogsSearchTimeout)

  if (!newValue.trim()) {
    discogsSearchResults.value = []
    return
  }

  discogsSearchTimeout = setTimeout(async () => {
    await searchDiscogs()
  }, 500)
})

async function searchDiscogs() {
  if (!discogsSearchQuery.value.trim()) return

  isSearchingDiscogs.value = true
  try {
    const params = new URLSearchParams({ q: discogsSearchQuery.value })
    const response = await $fetch<{ results: any[] }>(`/api/discogs/search?${params}`)
    discogsSearchResults.value = response.results || []
  } catch (error) {
    console.error('Discogs search failed:', error)
    discogsSearchResults.value = []
  } finally {
    isSearchingDiscogs.value = false
  }
}

async function addRecordFromDiscogs(discogsId: number) {
  isAddingRecord.value = true
  addingDiscogsId.value = discogsId

  try {
    const response = await $fetch<{ record: any; updated: boolean }>('/api/records/create', {
      method: 'POST',
      body: { discogsId }
    })

    // Flip to collection mode, pre-filtered to the record we just added so its
    // (now server-side synced) tracks are immediately visible and addable.
    addTrackMode.value = 'collection'
    discogsSearchQuery.value = ''
    discogsSearchResults.value = []
    const rel = response.record?.release
    trackSearchQuery.value = rel?.artist || rel?.title || ''
    await searchTracks()
  } catch (error: any) {
    console.error('Failed to add record:', error)
    alert(error.data?.message || 'Failed to add record')
  } finally {
    isAddingRecord.value = false
    addingDiscogsId.value = null
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

onMounted(async () => {
  await fetchSetlist()
  await searchTracks()

  // Auto-open edit modal if needed
  if (showEditModal.value && setlist.value) {
    openEditModal()
  }
})
</script>
