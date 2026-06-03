<template>
  <div class="min-h-screen" style="background: var(--bg-primary);">
    <AppNav />
    <main class="bg-grain min-h-[calc(100vh-4rem)]" style="padding-bottom: var(--player-height, 0px);">
      <slot />
    </main>
    <GlobalPlayer />
  </div>
</template>
