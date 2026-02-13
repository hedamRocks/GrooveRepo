<template>
  <div class="min-h-screen bg-black">
    <div class="max-w-7xl mx-auto">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>

      <!-- Setlist Content -->
      <div v-else-if="setlist">
        <!-- Compact Header -->
        <div class="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/10">
          <div class="px-4 py-2">
            <div class="flex items-center justify-between">
              <NuxtLink
                to="/setlists"
                class="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </NuxtLink>

              <div class="flex-1 px-3 min-w-0">
                <h1 class="text-base font-bold text-white truncate">
                  {{ setlist.name }}
                </h1>
              </div>

              <div class="flex items-center gap-1">
                <button
                  @click="exportToCSV"
                  class="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  title="Export to CSV"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>

                <button
                  @click="showEditModal = true"
                  class="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div v-if="setlist.tracks.length > 0" class="px-4 py-3 space-y-3">
          <!-- Filter Pills Row -->
          <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <!-- Sort -->
            <div class="relative flex-shrink-0">
              <select
                v-model="sortValue"
                @change="handleSortChange($event)"
                class="pl-3 pr-8 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-colors"
              >
                <option value="added-desc" class="bg-gray-900">Date Added (Newest)</option>
                <option value="added-asc" class="bg-gray-900">Date Added (Oldest)</option>
                <option value="title-asc" class="bg-gray-900">Title (A-Z)</option>
                <option value="title-desc" class="bg-gray-900">Title (Z-A)</option>
                <option value="artist-asc" class="bg-gray-900">Artist (A-Z)</option>
                <option value="artist-desc" class="bg-gray-900">Artist (Z-A)</option>
                <option value="bpm-asc" class="bg-gray-900">BPM (Low-High)</option>
                <option value="bpm-desc" class="bg-gray-900">BPM (High-Low)</option>
              </select>
              <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <!-- Country Filter -->
            <div class="relative flex-shrink-0">
              <select
                v-model="selectedCountry"
                class="pl-3 pr-8 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-colors"
              >
                <option value="" class="bg-gray-900">All Countries</option>
                <option v-for="country in availableCountries" :key="country" :value="country" class="bg-gray-900">
                  {{ country }}
                </option>
              </select>
              <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <!-- Tag Filter Button -->
            <button
              @click="showTagFilterModal = true"
              class="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 hover:bg-white/10 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>
                {{ selectedTagIds.length === 0 ? 'Tags' : selectedTagIds.length }}
              </span>
            </button>

            <!-- Tag Operator Toggle -->
            <div v-if="selectedTagIds.length > 1" class="flex-shrink-0 flex bg-white/5 border border-white/10 rounded-full overflow-hidden">
              <button
                @click="tagFilterOperator = 'AND'"
                :class="[
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  tagFilterOperator === 'AND'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                ]"
              >
                ALL
              </button>
              <button
                @click="tagFilterOperator = 'OR'"
                :class="[
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  tagFilterOperator === 'OR'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                ]"
              >
                ANY
              </button>
            </div>

            <!-- Clear Filters -->
            <button
              v-if="selectedCountry || selectedTagIds.length > 0"
              @click="clearFilters"
              class="flex-shrink-0 px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>

          <!-- Filter Count -->
          <div v-if="filteredTracks.length !== setlist.tracks.length" class="text-xs text-gray-500">
            Showing {{ filteredTracks.length }} of {{ setlist.tracks.length }} tracks
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="setlist.tracks.length === 0" class="flex flex-col items-center justify-center py-20 px-4">
          <div class="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <svg class="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-white mb-2">No tracks yet</h3>
          <p class="text-sm text-gray-500 mb-6 text-center max-w-xs">Start building your setlist by adding tracks from your collection</p>
          <button
            @click="showAddTrackModal = true"
            class="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/25"
          >
            Add Your First Track
          </button>
        </div>

        <!-- Tracks List (Mobile-First Cards) -->
        <div v-else class="px-4 pb-24 space-y-3">
          <div
            v-for="(setlistTrack, index) in filteredTracks"
            :key="setlistTrack.id"
            class="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/[0.07] hover:border-white/20 transition-all"
          >
            <div class="flex gap-3 p-3">
              <!-- Album Cover -->
              <div class="relative flex-shrink-0">
                <img
                  v-if="setlistTrack.track.userRecord?.release?.thumbUrl"
                  :src="setlistTrack.track.userRecord.release.thumbUrl"
                  :alt="`${setlistTrack.track.title} cover`"
                  class="w-16 h-16 rounded-lg object-cover shadow-lg"
                />
                <div
                  v-else
                  class="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"
                >
                  <svg class="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <!-- Track Number Badge -->
                <div class="absolute -top-1 -left-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                  {{ index + 1 }}
                </div>
              </div>

              <!-- Track Info -->
              <div class="flex-1 min-w-0">
                <!-- Title & Artist -->
                <div class="mb-2">
                  <h3 class="text-sm font-medium text-white truncate mb-0.5">
                    {{ setlistTrack.track.title }}
                  </h3>
                  <p class="text-xs text-gray-400 truncate">
                    {{ setlistTrack.track.artist }}
                  </p>
                </div>

                <!-- Meta Pills - Position & BPM Stand Out -->
                <div class="flex flex-wrap gap-1.5">
                  <!-- Position - Emphasized -->
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/20 border border-purple-500/40 rounded-md text-xs text-purple-300 font-bold font-mono uppercase shadow-sm">
                    {{ setlistTrack.track.position }}
                  </span>

                  <!-- BPM - Emphasized -->
                  <button
                    @click="openBpmModal(setlistTrack)"
                    class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 border border-blue-500/40 rounded-md text-xs text-blue-300 font-bold hover:bg-blue-500/30 transition-colors shadow-sm"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {{ setlistTrack.manualBpm || setlistTrack.track.bpm || '-' }}
                  </button>

                  <!-- Country -->
                  <span v-if="setlistTrack.track.userRecord?.release?.country" class="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-gray-400">
                    {{ setlistTrack.track.userRecord.release.country }}
                  </span>
                </div>

                <!-- Tags -->
                <div class="mt-2">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="trackTag in setlistTrack.track.trackTags.slice(0, 3)"
                      :key="trackTag.id"
                      class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-white rounded"
                      :style="{ backgroundColor: trackTag.tag.color || '#6B7280' }"
                    >
                      {{ trackTag.tag.name }}
                    </span>
                    <button
                      v-if="setlistTrack.track.trackTags.length > 3"
                      @click="openTagModal(setlistTrack.track)"
                      class="inline-flex items-center px-1.5 py-0.5 text-[10px] text-gray-400 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors"
                    >
                      +{{ setlistTrack.track.trackTags.length - 3 }}
                    </button>
                    <button
                      v-if="setlistTrack.track.trackTags.length === 0"
                      @click="openTagModal(setlistTrack.track)"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-gray-400 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors"
                    >
                      <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add tag
                    </button>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex flex-col gap-1 flex-shrink-0">
                <button
                  @click="openTagModal(setlistTrack.track)"
                  class="p-2 text-gray-500 hover:text-blue-500 hover:bg-white/5 rounded-lg transition-all"
                  title="Manage tags"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </button>
                <a
                  :href="getYoutubeSearchUrl(setlistTrack.track.artist, setlistTrack.track.title)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="p-2 text-gray-500 hover:text-red-500 hover:bg-white/5 rounded-lg transition-all"
                  title="Search on YouTube"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <button
                  @click="openRemoveModal(setlistTrack)"
                  class="p-2 text-gray-500 hover:text-red-500 hover:bg-white/5 rounded-lg transition-all"
                  title="Remove track"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Fixed Add Track Button -->
        <div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none">
          <div class="max-w-7xl mx-auto pointer-events-auto">
            <button
              @click="showAddTrackModal = true"
              class="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-base font-semibold rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Track
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Track Modal -->
    <div
      v-if="showAddTrackModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto"
      @click="showAddTrackModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Track to Setlist</h2>

          <!-- Tab Selector -->
          <div class="flex gap-2 mb-4">
            <button
              @click="addTrackMode = 'collection'"
              class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="addTrackMode === 'collection'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
            >
              From Collection
            </button>
            <button
              @click="addTrackMode = 'discogs'"
              class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="addTrackMode === 'discogs'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
            >
              Add from Discogs
            </button>
          </div>

          <!-- Collection Search Mode -->
          <div v-if="addTrackMode === 'collection'">
            <!-- Search -->
            <div class="mb-4">
              <input
                v-model="trackSearchQuery"
                type="text"
                placeholder="Search your collection..."
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @input="searchTracks"
              />
            </div>

            <!-- Available Tracks -->
            <div v-if="isSearchingTracks" class="text-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>

            <div v-else-if="availableTracks.length === 0" class="text-center py-8">
              <p class="text-gray-500 dark:text-gray-400 mb-4">No tracks found in your collection</p>
              <button
                @click="addTrackMode = 'discogs'"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Add from Discogs
              </button>
            </div>

          <div v-else class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="track in availableTracks"
              :key="track.id"
              class="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              <img
                v-if="track.userRecord?.release?.thumbUrl"
                :src="track.userRecord.release.thumbUrl"
                :alt="`${track.title} cover`"
                class="w-12 h-12 rounded object-cover cursor-pointer"
                @click="addTrackToSetlist(track)"
              />
              <div
                v-else
                class="w-12 h-12 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 cursor-pointer"
                @click="addTrackToSetlist(track)"
              >
                <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div class="flex-1 min-w-0 cursor-pointer" @click="addTrackToSetlist(track)">
                <h4 class="font-medium text-gray-900 dark:text-white truncate">{{ track.title }}</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400 truncate">{{ track.artist }}</p>
              </div>
              <div v-if="track.bpm" class="text-sm text-gray-500 dark:text-gray-500">
                {{ track.bpm }} BPM
              </div>
              <a
                :href="getYoutubeSearchUrl(track.artist, track.title)"
                target="_blank"
                rel="noopener noreferrer"
                class="p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                title="Search on YouTube"
                @click.stop
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>
          </div>

          <!-- Discogs Search Mode -->
          <div v-else-if="addTrackMode === 'discogs'">
            <!-- Discogs Search -->
            <div class="mb-4">
              <input
                v-model="discogsSearchQuery"
                type="text"
                placeholder="Search Discogs..."
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Discogs Search Results -->
            <div v-if="isSearchingDiscogs" class="text-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Searching Discogs...</p>
            </div>

            <div v-else-if="discogsSearchResults.length > 0" class="space-y-3 max-h-96 overflow-y-auto">
              <div
                v-for="result in discogsSearchResults"
                :key="result.id"
                class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <div class="p-3 flex gap-3">
                  <div class="w-16 h-16 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                    <img
                      v-if="result.cover_image || result.thumb"
                      :src="result.thumb || result.cover_image"
                      :alt="result.title"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-gray-900 dark:text-white text-sm truncate">{{ result.title }}</h4>
                    <p class="text-xs text-gray-600 dark:text-gray-400">{{ result.year || 'Year unknown' }}</p>
                    <p v-if="result.format?.length" class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {{ result.format.join(', ') }}
                    </p>
                  </div>
                  <button
                    @click="addRecordFromDiscogs(result.id)"
                    :disabled="isAddingRecord && addingDiscogsId === result.id"
                    class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex-shrink-0 self-center"
                  >
                    {{ isAddingRecord && addingDiscogsId === result.id ? 'Adding...' : 'Add' }}
                  </button>
                </div>
              </div>
            </div>

            <div v-else-if="discogsSearchQuery && !isSearchingDiscogs" class="text-center py-8">
              <p class="text-gray-500 dark:text-gray-400">No results found on Discogs</p>
            </div>

            <div v-else class="text-center py-8">
              <p class="text-gray-500 dark:text-gray-400">Search Discogs to add a new record</p>
            </div>
          </div>

          <div class="flex justify-end mt-4">
            <button
              @click="showAddTrackModal = false"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- BPM Modal -->
    <div
      v-if="showBpmModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="showBpmModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full"
        @click.stop
      >
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">Set BPM</h2>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {{ selectedTrack?.track.title }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-500">
                Original BPM: {{ selectedTrack?.track.bpm || 'Unknown' }}
              </p>
            </div>
            <button
              @click="showBpmModal = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <BpmTapper @bpm-selected="handleBpmSelected" />
        </div>
      </div>
    </div>

    <!-- Remove Track Confirmation -->
    <div
      v-if="showRemoveModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="showRemoveModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
        @click.stop
      >
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Remove Track</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Remove "{{ trackToRemove?.track.title }}" from this setlist?
          </p>
          <div class="flex justify-end space-x-3">
            <button
              @click="showRemoveModal = false"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              @click="removeTrack"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Setlist Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="showEditModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
        @click.stop
      >
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Setlist</h2>

          <form @submit.prevent="updateSetlist">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  v-model="editForm.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  v-model="editForm.description"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Venue
                </label>
                <input
                  v-model="editForm.venue"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  v-model="editForm.date"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (minutes)
                </label>
                <input
                  v-model.number="editForm.duration"
                  type="number"
                  min="1"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="showEditModal = false"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Tag Filter Modal -->
    <div
      v-if="showTagFilterModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="showTagFilterModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        @click.stop
      >
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Filter by Tags</h3>
            <button
              @click="showTagFilterModal = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Tag List -->
          <div v-if="availableTags.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
            No tags available.
          </div>

          <div v-else class="space-y-2 max-h-96 overflow-y-auto">
            <button
              v-for="tag in availableTags"
              :key="tag.id"
              @click="toggleTagFilter(tag.id)"
              class="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              :class="{ 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500': selectedTagIds.includes(tag.id) }"
            >
              <div
                class="w-5 h-5 rounded flex-shrink-0"
                :style="{ backgroundColor: tag.color || '#6B7280' }"
              ></div>
              <span class="text-sm text-gray-900 dark:text-white flex-1">{{ tag.name }}</span>
              <svg v-if="selectedTagIds.includes(tag.id)" class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex space-x-3">
            <button
              v-if="selectedTagIds.length > 0"
              @click="clearTagFilter"
              class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
            <button
              @click="showTagFilterModal = false"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tag Management Modal -->
    <div
      v-if="showTagManagementModal && selectedTrackForTags"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="showTagManagementModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        @click.stop
      >
        <!-- Header -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">Manage Tags</h2>
            <button
              @click="showTagManagementModal = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
            {{ selectedTrackForTags.artist }} - {{ selectedTrackForTags.title }}
          </p>
        </div>

        <!-- Tag List -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Create New Tag Form -->
          <div v-if="!showCreateTagForm && !isLoadingTags" class="mb-4">
            <button
              @click="showCreateTagForm = true"
              class="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Create New Tag
            </button>
          </div>

          <div v-if="showCreateTagForm" class="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <form @submit.prevent="createNewTag">
              <div class="space-y-3">
                <div>
                  <input
                    v-model="newTagName"
                    type="text"
                    placeholder="Tag name"
                    required
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div class="flex gap-2">
                  <div
                    v-for="color in tagColorPresets"
                    :key="color"
                    @click="newTagColor = color"
                    class="w-8 h-8 rounded cursor-pointer transition-transform hover:scale-110"
                    :class="{ 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-700': newTagColor === color }"
                    :style="{ backgroundColor: color }"
                  ></div>
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    @click="showCreateTagForm = false; newTagName = ''; newTagColor = '#6366F1'"
                    class="flex-1 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="isCreatingTag"
                    class="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ isCreatingTag ? 'Creating...' : 'Create' }}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div v-if="isLoadingTags" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          <div v-else-if="allUserTags.length === 0 && !showCreateTagForm" class="text-center py-8">
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">No tags created yet</p>
          </div>

          <div v-else-if="allUserTags.length > 0" class="space-y-2">
            <button
              v-for="tag in allUserTags"
              :key="tag.id"
              @click="toggleTrackTag(tag.id)"
              class="w-full flex items-center justify-between p-3 rounded-lg border transition-all"
              :class="isTagAssigned(tag.id)
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'"
            >
              <div class="flex items-center space-x-3">
                <div
                  class="w-4 h-4 rounded flex-shrink-0"
                  :style="{ backgroundColor: tag.color || '#6B7280' }"
                ></div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ tag.name }}</span>
              </div>
              <div v-if="isTagAssigned(tag.id)" class="flex items-center space-x-2">
                <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            @click="showTagManagementModal = false"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
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
const newTagColor = ref('#6366F1')
const isCreatingTag = ref(false)
const tagColorPresets = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280']

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

    // Refresh the track search to show the newly added record
    await searchTracks()

    // Switch back to collection mode to show the new record
    addTrackMode.value = 'collection'
    discogsSearchQuery.value = ''
    discogsSearchResults.value = []

    // Show success message
    if (response.updated) {
      alert('Record already in your collection - metadata updated!')
    }
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
