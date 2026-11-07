<script setup lang="ts">defineProps<{ size?: number }>();</script>
<template><div class="animate-spin rounded-full border-4 border-white/20 border-t-white" :style="{ width: `${size ?? 40}px`, height: `${size ?? 40}px` }" role="status" aria-label="Loading" /></template>
