<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { eventsEmitter, eventsListenersAdder, socket } from '@/connection';
import { inviteCodeFromUrl } from '@/invite';
import BaseModal from '../modal/BaseModal.vue';

const { t } = useI18n();
const mode = ref<'closed' | 'create' | 'join' | 'howto' | 'loading' | 'error'>('closed');
const createName = ref(''); const joinCode = ref(''); const joinName = ref('');
const fromInvite = ref(false);
const inviteCode = typeof window !== 'undefined' ? inviteCodeFromUrl(window.location.href) : '';
if (inviteCode) {
  joinCode.value = inviteCode;
  fromInvite.value = true;
  mode.value = 'join';
  window.history.replaceState(null, '', import.meta.env.BASE_URL || '/');
}
const errorType = ref('inexistent-lobby');
const errorKey = computed(() => ({ 'lobby-in-game': 'HOME.ERRORS.LOBBY_IN_GAME', 'inexistent-lobby': 'HOME.ERRORS.INEXISTENT_LOBBY', 'no-name': 'HOME.ERRORS.NO_NAME', 'repeated-name': 'HOME.ERRORS.REPEATED_NAME', 'player-already-in-lobby': 'HOME.ERRORS.PLAYER_ALREADY_IN_LOBBY', 'lobby-full': 'HOME.ERRORS.LOBBY_FULL', 'internal': 'HOME.ERRORS.INTERNAL' } as Record<string, string>)[errorType.value] ?? 'HOME.ERRORS.INEXISTENT_LOBBY');
eventsListenersAdder.lobby.joinLobbySuccess(() => { mode.value = 'closed'; });
eventsListenersAdder.lobby.joinLobbyError((type: string) => { errorType.value = type; if (mode.value === 'loading') mode.value = 'error'; });
socket.on('internal-server-error', () => { errorType.value = 'internal'; if (mode.value === 'loading') mode.value = 'error'; });
const createLobby = () => { eventsEmitter.lobby.emitCreateLobby(createName.value); mode.value = 'loading'; };
const joinLobby = () => { eventsEmitter.lobby.emitJoinLoby(joinCode.value, joinName.value); mode.value = 'loading'; };
const btn = 'rounded-full px-5 py-2.5 font-display font-bold focus:outline-none focus:ring-4';
</script>
<template>
  <div class="card-table flex min-h-screen w-full flex-col text-white">
    <header class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
      <span class="font-display text-2xl font-black tracking-tight">Twist</span>
      <span class="hidden text-sm text-emerald-100/80 sm:block">{{ t('APP.SUBTITLE') }}</span>
    </header>
    <main class="flex flex-1 items-center justify-center px-4 py-10">
      <div class="flex w-full max-w-sm flex-col items-center">
        <div aria-hidden="true" class="mb-8 flex -space-x-4">
          <span class="flex h-28 w-20 rotate-[-8deg] items-center justify-center rounded-lg border-4 border-white bg-red-600 font-display text-3xl font-black shadow-xl">7</span>
          <span class="z-10 flex h-28 w-20 items-center justify-center rounded-lg border-4 border-white bg-yellow-400 font-display text-3xl font-black text-neutral-900 shadow-xl">⊘</span>
          <span class="flex h-28 w-20 rotate-[8deg] items-center justify-center rounded-lg border-4 border-white bg-blue-600 font-display text-3xl font-black shadow-xl">+2</span>
        </div>
        <h1 class="text-center font-display text-4xl font-black">Twist</h1>
        <p class="mt-2 text-center text-emerald-100/85">Match colour, number or symbol. Empty your hand, score the rest, race to the target.</p>
        <nav class="mt-8 flex w-full flex-col gap-3">
          <button type="button" :class="[btn, 'w-full bg-amber-400 text-emerald-950 hover:bg-amber-300 focus:ring-amber-200/60']" @click="mode = 'create'">{{ t('HOME.CREATE_GAME') }}</button>
          <button type="button" :class="[btn, 'w-full bg-white text-emerald-900 hover:bg-emerald-50 focus:ring-white/40']" @click="mode = 'join'">{{ t('HOME.JOIN_GAME') }}</button>
          <button type="button" :class="[btn, 'w-full border-2 border-white/70 text-white hover:bg-white/10 focus:ring-white/30']" @click="mode = 'howto'">{{ t('HOME.HOW_TO_PLAY') }}</button>
        </nav>
      </div>
    </main>
  </div>

  <BaseModal :title="t('HOWTO.TITLE')" :show="mode === 'howto'" :close-modal="() => mode = 'closed'">
    <template #body><p class="leading-relaxed">{{ t('HOWTO.BODY') }}</p></template>
    <template #footer><button type="button" :class="[btn, 'bg-emerald-800 text-white']" @click="mode = 'closed'">{{ t('HOME.CLOSE') }}</button></template>
  </BaseModal>

  <BaseModal :title="mode === 'join' || mode === 'loading' || mode === 'error' ? t('HOME.JOIN_ROOM') : t('HOME.CREATE_ROOM')" :show="mode === 'create' || mode === 'join' || mode === 'loading' || mode === 'error'" :close-modal="mode === 'loading' ? undefined : () => mode = 'closed'">
    <template #body>
      <div v-if="mode === 'create'" class="flex flex-col gap-2">
        <label class="text-sm font-semibold" for="cn">{{ t('HOME.PLAYER_NAME') }}</label>
        <input id="cn" v-model="createName" class="rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600" maxlength="24" @keyup.enter="createLobby">
      </div>
      <div v-else-if="mode === 'join'" class="flex flex-col gap-4">
        <p v-if="fromInvite" class="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">{{ t('HOME.INVITED') }}</p>
        <div class="flex flex-col gap-2"><label class="text-sm font-semibold" for="jc">{{ t('HOME.ROOM_CODE') }}</label><input id="jc" v-model="joinCode" class="rounded-lg border border-neutral-300 px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-600" maxlength="6"></div>
        <div class="flex flex-col gap-2"><label class="text-sm font-semibold" for="jn">{{ t('HOME.PLAYER_NAME') }}</label><input id="jn" v-model="joinName" class="rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600" maxlength="24" @keyup.enter="joinLobby"></div>
      </div>
      <p v-else-if="mode === 'loading'" class="text-center">…</p>
      <p v-else class="text-center">{{ t(errorKey) }}</p>
    </template>
    <template #footer>
      <template v-if="mode === 'create'"><button type="button" :class="[btn, 'bg-emerald-800 text-white']" @click="createLobby">{{ t('HOME.CREATE') }}</button></template>
      <template v-else-if="mode === 'join'"><button type="button" :class="[btn, 'bg-emerald-800 text-white']" @click="joinLobby">{{ t('HOME.JOIN') }}</button></template>
      <template v-else-if="mode === 'error'"><button type="button" :class="[btn, 'bg-emerald-800 text-white']" @click="mode = 'join'">{{ t('HOME.BACK') }}</button></template>
      <button type="button" :class="[btn, 'border border-neutral-300']" @click="mode = 'closed'">{{ t('HOME.CLOSE') }}</button>
    </template>
  </BaseModal>
</template>
