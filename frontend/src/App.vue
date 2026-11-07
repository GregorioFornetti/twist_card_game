<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { lobby, socket } from './connection';
import HomePage from './components/pages/HomePage.vue';
import LobbyPage from './components/pages/LobbyPage.vue';
import GamePage from './components/pages/GamePage.vue';
import EndGamePage from './components/pages/EndGamePage.vue';
import LoadingSpinner from './components/LoadingSpinner.vue';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
const { t } = useI18n();
const connectionStatus = ref<'loading' | 'connected' | 'disconnected'>('loading');
socket.on('connect', () => { connectionStatus.value = 'connected'; });
socket.on('connect_error', () => { connectionStatus.value = 'disconnected'; });
</script>
<template>
  <div v-if="connectionStatus === 'loading'" class="card-table flex h-screen w-full items-center justify-center"><LoadingSpinner :size="70" /></div>
  <div v-else-if="connectionStatus === 'disconnected'" class="card-table flex h-screen w-full items-center justify-center px-4 text-center text-white"><h1 class="font-display text-2xl font-bold">{{ t('APP.CONNECTION_ERROR') }}</h1></div>
  <EndGamePage v-else-if="lobby?.gameRanking" />
  <GamePage v-else-if="lobby?.game" />
  <LobbyPage v-else-if="lobby" />
  <HomePage v-else />
  <LanguageSwitcher />
</template>
