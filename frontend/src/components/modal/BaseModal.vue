<script setup lang="ts">
defineProps<{ title: string; show: boolean; closeModal?: () => void; wide?: boolean; dark?: boolean }>();
</script>
<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
    <div class="max-h-[90vh] w-full overflow-y-auto rounded-xl p-4 shadow-2xl sm:p-6" :class="[wide ? 'max-w-3xl' : 'max-w-md', dark ? 'bg-emerald-950 text-white' : 'bg-white text-neutral-900']">
      <div class="flex items-start justify-between gap-4">
        <h2 class="font-display text-2xl font-bold">{{ title }}</h2>
        <button v-if="closeModal" type="button" class="rounded-full px-2 text-2xl leading-none" :class="dark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'" aria-label="Close" @click="closeModal">×</button>
      </div>
      <div class="mt-4"><slot name="body" /></div>
      <div class="mt-6 flex flex-wrap justify-end gap-2"><slot name="footer" /></div>
    </div>
  </div>
</template>
