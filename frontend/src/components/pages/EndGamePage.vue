<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { eventsEmitter, lobby, playerId } from '@/connection';
import PlayerAvatar from '../PlayerAvatar.vue';
const { t } = useI18n();
const isLeader = computed(() => !!lobby.value?.players.find(p => p.id === playerId)?.leader);
const ranking = computed(() => (lobby.value?.gameRanking ?? []).map(id => lobby.value!.players.find(p => p.id === id)).filter(Boolean));
const winnerName = computed(() => ranking.value[0]?.name ?? '');
const btn = 'rounded-full px-5 py-2.5 font-display font-bold focus:outline-none focus:ring-4';
</script>
<template>
  <div v-if="lobby" class="card-table flex min-h-screen w-full flex-col items-center text-white">
    <main class="flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      <h1 class="font-display text-4xl font-black">{{ t('END.TITLE') }}</h1>
      <p class="mt-3 font-display text-2xl font-bold text-amber-300">{{ t('END.WINNER', { name: winnerName }) }}</p>
      <h2 class="mt-8 self-start font-display text-xl font-bold">{{ t('END.RANKING') }}</h2>
      <ol class="mt-3 w-full space-y-2 text-left">
        <li v-for="(p, i) in ranking" :key="p!.id" class="flex items-center gap-3 rounded-lg bg-black/25 px-4 py-3">
          <span class="font-display text-lg font-black">{{ i + 1 }}.</span>
          <PlayerAvatar :emote="p!.emote" :color="p!.color" size="sm" />
          <span class="font-semibold">{{ p!.name }}</span>
          <span class="ml-auto font-bold">{{ lobby.game?.players[p!.id]?.score ?? 0 }} pts</span>
        </li>
      </ol>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <button v-if="isLeader" type="button" :class="[btn, 'bg-amber-400 text-emerald-950 hover:bg-amber-300']" @click="eventsEmitter.lobby.emitRematchGameRequest()">{{ t('END.REMATCH_GAME') }}</button>
        <button type="button" :class="[btn, 'bg-white/20 text-white hover:bg-white/30']" @click="eventsEmitter.lobby.emitRematchRequest()">{{ t('END.REMATCH') }}</button>
        <button type="button" :class="[btn, 'bg-white text-emerald-950']" @click="eventsEmitter.general.emitLogout()">{{ t('END.HOME') }}</button>
      </div>
    </main>
  </div>
</template>
