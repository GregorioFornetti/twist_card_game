<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { LOCALES, setLocale } from '@/plugins/i18n';
const { t, locale } = useI18n();
const onChange = (e: Event) => setLocale((e.target as HTMLSelectElement).value);
</script>
<template>
  <label class="fixed bottom-3 right-3 z-40 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-sm font-semibold text-white shadow-lg">
    <span class="sr-only">{{ t('APP.LANGUAGE') }}</span>
    <span aria-hidden="true">🌐</span>
    <select :value="locale" :aria-label="t('APP.LANGUAGE')" class="bg-transparent font-semibold text-white focus:outline-none [&>option]:text-neutral-900" @change="onChange">
      <option v-for="l in LOCALES" :key="l.code" :value="l.code">{{ l.label }}</option>
    </select>
  </label>
</template>
