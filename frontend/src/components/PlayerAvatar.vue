<script setup lang="ts">
defineProps<{ emote?: string; color?: string; size?: 'sm' | 'md' }>();
</script>
<template>
  <span class="inline-flex items-center justify-center rounded-full text-lg" :class="size === 'sm' ? 'h-8 w-8 text-base' : 'h-11 w-11'" :style="{ background: color ?? '#4361ee' }">{{ emote ?? '🙂' }}</span>
</template>
