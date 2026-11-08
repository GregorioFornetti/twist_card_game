<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { eventsEmitter, eventsListenersAdder, lobby, playerId } from '@/connection';
import { playVoiceCue, sfx, setSoundEnabled, soundEnabled } from '@/sound';
import BaseModal from '../modal/BaseModal.vue';
import PlayingCard from '../PlayingCard.vue';
import PlayerAvatar from '../PlayerAvatar.vue';
import type { Card, CardColor } from '@/interfaces/Lobby';
import { isPlayable, WILD_HEX, WILD_KINDS } from './gameState';

const { t } = useI18n();
const game = computed(() => lobby.value?.game);
const me = computed(() => lobby.value?.players.find(p => p.id === playerId));
const isSpectator = computed(() => !!me.value?.spectator);
const showExit = ref(false);
const soundOn = ref(soundEnabled());
const toggleSound = () => { soundOn.value = !soundOn.value; setSoundEnabled(soundOn.value); if (soundOn.value) sfx.click(); };
const isMyTurn = computed(() => !!game.value && game.value.currentPlayerId === playerId && game.value.status === 'playing');
const turnName = computed(() => lobby.value?.players.find(p => p.id === game.value?.currentPlayerId)?.name ?? '');
const hand = computed(() => game.value?.currentPlayerCards ?? []);
const suits = computed(() => game.value?.colors ?? []);
const suitHex = (id: string) => (id === 'wild' ? WILD_HEX : suits.value.find(c => c.id === id)?.hex ?? '#171717');
const suitName = (id: string) => suits.value.find(c => c.id === id)?.name ?? id;
const suitHexes = computed(() => suits.value.map(c => c.hex));
const pendingWild = ref<Card | null>(null);
const errorMsg = ref('');
let errTimer: ReturnType<typeof setTimeout> | undefined;
eventsListenersAdder.game.playError((type: string) => {
  sfx.error();
  const key = ({ 'not-your-turn': 'GAME.ERRORS.not-your-turn', 'card-not-playable': 'GAME.ERRORS.card-not-playable', 'color-required': 'GAME.ERRORS.color-required', 'must-play-drawn-card': 'GAME.ERRORS.must-play-drawn-card', 'color-locked': 'GAME.ERRORS.color-locked' } as Record<string, string>)[type];
  errorMsg.value = key ? t(key) : type;
  if (errTimer) clearTimeout(errTimer);
  errTimer = setTimeout(() => errorMsg.value = '', 3500);
});
const playable = (c: Card) => {
  const g = game.value; if (!g) return false;
  if ((g.status === 'swapcard' && g.pendingSwapCard?.chooserId === playerId && g.pendingSwapCard.targetId)
    || (g.status === 'gift' && g.pendingGift?.chooserId === playerId && g.pendingGift.targetId)) return true;
  if (g.status === 'penalty') return g.currentPlayerId === playerId && (c.kind === 'draw2' || c.kind === 'wild4' || c.kind === 'shield');
  if (g.status === 'challenging') return g.pendingDrawFour?.victimId === playerId && c.kind === 'shield';
  if (g.lockedColor && g.status === 'playing' && isMyTurn.value && WILD_KINDS.includes(c.kind)) return false;
  return isMyTurn.value && g.status === 'playing' && isPlayable(c, g.topCard, g.currentColor) && (!g.drawnCardId || g.drawnCardId === c.id);
};
const nameOf = (id: string) => lobby.value?.players.find(p => p.id === id)?.name ?? id;
const fanStyle = (i: number, n: number) => { const o = i - (n - 1) / 2; return { transform: `rotate(${o * 4}deg) translateY(${Math.abs(o) * 3}px)`, zIndex: i }; };
const onCard = (card: Card) => {
  if (!playable(card)) return;
  const g = game.value!;
  if (g.status === 'swapcard') { eventsEmitter.game.emitSwapCardGive(card.id); return; }
  if (g.status === 'gift') { eventsEmitter.game.emitGiftGive(card.id); return; }
  if (card.kind !== 'gabs' && WILD_KINDS.includes(card.kind)) { pendingWild.value = card; return; }
  eventsEmitter.game.emitPlayCard(card.id, undefined);
};
const chooseColor = (color: CardColor) => {
  if (!pendingWild.value) return;
  eventsEmitter.game.emitPlayCard(pendingWild.value.id, color);
  pendingWild.value = null;
};
const now = ref(Date.now());
let tick: ReturnType<typeof setInterval> | undefined;
onMounted(() => { tick = setInterval(() => { now.value = Date.now(); }, 200); });
onBeforeUnmount(() => { if (tick) clearInterval(tick); });
const turnRemainingMs = computed(() => (game.value?.turnEndsAt ? Math.max(0, game.value.turnEndsAt - now.value) : null));
const turnSeconds = computed(() => (turnRemainingMs.value === null ? null : Math.ceil(turnRemainingMs.value / 1000)));
const turnPct = computed(() => (turnRemainingMs.value === null || !game.value?.turnTimeLimitMs ? 0 : Math.min(100, (turnRemainingMs.value / game.value.turnTimeLimitMs) * 100)));
const turnUrgent = computed(() => turnSeconds.value !== null && turnSeconds.value <= 10);
const btn = 'rounded-full px-5 py-2.5 font-display font-bold focus:outline-none focus:ring-4';
let prevTopKey = '';
let prevHandCount = -1;
watch(() => (game.value ? `${game.value.topCard?.id ?? ''}-${game.value.discardCount}` : ''), (key) => {
  if (key && prevTopKey && key !== prevTopKey) sfx.play();
  if (key) prevTopKey = key;
});
watch(() => hand.value.length, (n) => {
  if (prevHandCount >= 0 && n > prevHandCount) sfx.draw();
  prevHandCount = n;
});
watch(isMyTurn, (mine, was) => { if (mine && !was) sfx.turn(); });
watch(() => game.value?.status, (s) => {
  if ((s === 'hand-over' && game.value?.handWinnerId === playerId) || (s === 'game-over' && game.value?.winnerId === playerId)) sfx.win();
});
let lastCueSeq = game.value?.soundCue?.seq ?? 0;
watch(() => game.value?.soundCue, (cue) => {
  if (!cue || cue.seq <= lastCueSeq) return;
  lastCueSeq = cue.seq;
  playVoiceCue(cue.name);
});
const confirmExit = () => { showExit.value = false; eventsEmitter.general.emitLogout(); };
</script>
<template>
  <div v-if="lobby && game" class="card-table flex min-h-screen w-full flex-col text-white">
    <header class="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
      <span class="font-display text-2xl font-black">Twist</span>
      <span v-if="lobby.guris" class="rounded-full bg-amber-400 px-3 py-1 text-sm font-black text-emerald-950">{{ t('LOBBY.GURIS') }}</span>
      <span class="rounded-full bg-black/25 px-3 py-1 text-sm font-semibold">{{ t('GAME.HAND', { n: game.handNumber }) }} · {{ t('LOBBY.TARGET') }} {{ game.targetScore }}</span>
      <span class="rounded-full px-3 py-1 text-sm font-bold text-white" :style="{ background: suitHex(game.currentColor) }">{{ t('GAME.CURRENT_COLOR') }}: {{ suitName(game.currentColor) }}</span>
      <span class="rounded-full bg-black/25 px-3 py-1 text-sm font-semibold">{{ t('GAME.TURN_TIMER') }}: {{ game.turnTimeSeconds === 0 ? t('LOBBY.NO_LIMIT') : `${game.turnTimeSeconds}s` }}</span>
      <span class="rounded-full bg-black/25 px-3 py-1 text-sm font-semibold">{{ t('GAME.DIRECTION') }}: {{ game.direction === 1 ? '↻' : '↺' }}</span>
      <span class="ml-auto text-sm text-emerald-100/80">{{ game.lastAction }}</span>
      <button type="button" class="rounded-full bg-black/25 px-3 py-1 text-sm font-semibold hover:bg-black/40" :aria-pressed="soundOn" @click="toggleSound">{{ t('GAME.SOUND') }}: {{ soundOn ? '🔊' : '🔇' }}</button>
      <button type="button" class="rounded-full bg-red-700 px-3 py-1 text-sm font-bold text-white hover:bg-red-600" @click="showExit = true">{{ t('GAME.EXIT') }}</button>
    </header>

    <main class="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[1fr_300px]">
      <div>
        <!-- Opponents / scores -->
        <ul class="grid gap-2 sm:grid-cols-2">
          <li v-for="p in lobby.players" :key="p.id" class="flex items-center gap-2 rounded-lg bg-black/25 px-3 py-2" :class="game.currentPlayerId === p.id ? 'ring-2 ring-amber-300' : ''">
            <PlayerAvatar :emote="p.emote" :color="p.color" size="sm" />
            <span class="font-semibold">{{ p.name }}</span>
            <span v-if="p.id === me?.id" class="rounded-full bg-white/15 px-2 py-0.5 text-xs">{{ t('LOBBY.YOU') }}</span>
            <span v-if="p.bot" class="rounded-full bg-white/15 px-2 py-0.5 text-xs">{{ t('LOBBY.BOT') }}</span>
            <span v-if="p.spectator" class="rounded-full bg-white/15 px-2 py-0.5 text-xs">{{ t('LOBBY.SPECTATOR') }}</span>
            <span v-if="game.currentPlayerId === p.id && turnSeconds !== null" class="rounded-full px-2 py-0.5 text-xs font-black tabular-nums" :class="turnUrgent ? 'bg-red-600 text-white' : 'bg-amber-300 text-emerald-950'" :title="t('GAME.TURN_TIMER')">⏱ {{ turnSeconds }}s</span>
            <span class="ml-auto text-sm text-emerald-100/85">{{ game.players[p.id]?.numCards ?? 0 }} {{ t('GAME.CARDS') }} · {{ game.players[p.id]?.score ?? 0 }} pts</span>
            <span v-if="(game.players[p.id]?.numCards ?? 0) === 1" class="rounded-full bg-red-600 px-2 py-0.5 text-xs font-black">{{ t('GAME.ONE_CARD') }}</span>
          </li>
        </ul>

        <p v-if="isSpectator" role="status" class="mt-4 rounded-lg bg-black/25 px-4 py-3 font-display text-lg font-bold text-amber-200">{{ t('GAME.SPECTATING') }} — {{ t('GAME.WAITING_NEXT_HAND') }}</p>
        <p v-else role="status" class="mt-4 font-display text-xl font-bold" :class="isMyTurn ? 'text-amber-300' : ''">{{ isMyTurn ? t('GAME.YOUR_TURN') : t('GAME.WAITING_FOR', { name: turnName }) }}</p>
        <div v-if="turnSeconds !== null && ['playing', 'challenging', 'penalty', 'swapping', 'swapcard', 'gift', 'peeking'].includes(game.status)" class="mt-2 max-w-md" role="timer" :aria-label="t('GAME.TURN_TIMER')">
          <div class="flex items-center justify-between text-sm font-semibold">
            <span>{{ t('GAME.TURN_TIMER') }} — {{ turnName }}</span>
            <span class="tabular-nums font-black" :class="turnUrgent ? 'text-red-300' : ''">{{ turnSeconds }}s</span>
          </div>
          <div class="mt-1 h-2.5 overflow-hidden rounded-full bg-black/40">
            <div class="h-full rounded-full transition-[width] duration-200" :class="turnSeconds <= 5 ? 'bg-red-500' : turnUrgent ? 'bg-amber-400' : 'bg-emerald-400'" :style="{ width: `${turnPct}%` }" />
          </div>
          <p v-if="turnUrgent && isMyTurn" class="mt-1 text-sm font-semibold text-red-200">{{ t('GAME.TIME_RUNNING_OUT') }}</p>
        </div>
        <p v-if="game.status === 'hand-over'" class="mt-2 rounded-lg bg-black/25 px-4 py-3 font-semibold">{{ t('GAME.HAND_OVER', { name: nameOf(game.handWinnerId ?? ''), points: game.handPoints ?? 0 }) }}</p>
        <p v-if="errorMsg" role="alert" class="mt-2 rounded-lg bg-red-900/50 px-4 py-2 font-semibold text-red-200">{{ errorMsg }}</p>

        <!-- Challenge -->
        <section v-if="game.status === 'challenging' && game.pendingDrawFour?.victimId === playerId" class="mt-4 rounded-lg bg-amber-400 px-4 py-4 text-emerald-950">
          <p class="font-display text-lg font-bold">{{ t('GAME.CHALLENGE_PROMPT', { name: nameOf(game.pendingDrawFour.offenderId) }) }}</p>
          <div class="mt-3 flex gap-2">
            <button type="button" :class="[btn, 'bg-emerald-900 text-white']" @click="eventsEmitter.game.emitChallengeResponse(false)">{{ t('GAME.ACCEPT_DRAW4') }}</button>
            <button type="button" :class="[btn, 'bg-white text-emerald-950']" @click="eventsEmitter.game.emitChallengeResponse(true)">{{ t('GAME.CHALLENGE') }}</button>
          </div>
        </section>
        <section v-else-if="game.status === 'challenging'" class="mt-4 rounded-lg bg-black/25 px-4 py-3 font-semibold">{{ nameOf(game.pendingDrawFour?.victimId ?? '') }} is deciding on a Wild Draw Four…</section>

        <!-- Stacked penalty -->
        <section v-if="game.status === 'penalty' && game.pendingPenalty?.victimId === playerId" class="mt-4 rounded-lg bg-amber-400 px-4 py-4 text-emerald-950">
          <p class="font-display text-lg font-bold">{{ t('GAME.PENALTY_YOURS', { amount: game.pendingPenalty.amount }) }}</p>
          <div class="mt-3 flex gap-2">
            <button type="button" :class="[btn, 'bg-emerald-900 text-white']" @click="eventsEmitter.game.emitPenaltyAccept()">{{ t('GAME.ACCEPT_PENALTY', { amount: game.pendingPenalty.amount }) }}</button>
          </div>
        </section>
        <section v-else-if="game.status === 'penalty'" class="mt-4 rounded-lg bg-black/25 px-4 py-3 font-semibold">{{ t('GAME.PENALTY_WAITING', { name: turnName, amount: game.pendingPenalty?.amount ?? 0 }) }}</section>

        <!-- Hand swap -->
        <section v-if="game.status === 'swapping' && game.pendingSwap?.chooserId === playerId" class="mt-4 rounded-lg bg-amber-400 px-4 py-4 text-emerald-950">
          <p class="font-display text-lg font-bold">{{ t('GAME.SWAP_YOURS') }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button v-for="p in lobby.players.filter(x => x.id !== playerId && game && game.players[x.id])" :key="p.id" type="button" :class="[btn, 'bg-emerald-900 text-white']" @click="eventsEmitter.game.emitSwapChoice(p.id)">{{ p.name }} ({{ game.players[p.id]?.numCards ?? 0 }})</button>
            <button type="button" :class="[btn, 'bg-white text-emerald-950']" @click="eventsEmitter.game.emitSwapChoice(undefined)">{{ t('GAME.KEEP_HAND') }}</button>
          </div>
        </section>
        <section v-else-if="game.status === 'swapping'" class="mt-4 rounded-lg bg-black/25 px-4 py-3 font-semibold">{{ t('GAME.SWAP_WAITING', { name: turnName }) }}</section>

        <!-- Swap a card / gift / peek choices -->
        <section v-if="game.status === 'swapcard' && game.pendingSwapCard?.chooserId === playerId" class="mt-4 rounded-lg bg-amber-400 px-4 py-4 text-emerald-950">
          <p class="font-display text-lg font-bold">{{ game.pendingSwapCard.targetId ? t('GAME.SWAPCARD_CARD') : t('GAME.SWAPCARD_TARGET') }}</p>
          <div v-if="!game.pendingSwapCard.targetId" class="mt-3 flex flex-wrap gap-2">
            <button v-for="p in lobby.players.filter(x => x.id !== playerId && game && game.players[x.id])" :key="p.id" type="button" :class="[btn, 'bg-emerald-900 text-white']" @click="eventsEmitter.game.emitSwapCardTarget(p.id)">{{ p.name }} ({{ game.players[p.id]?.numCards ?? 0 }})</button>
          </div>
          <button type="button" class="mt-3 font-semibold underline" @click="eventsEmitter.game.emitCancelChoice()">{{ t('GAME.CANCEL_CHOICE') }}</button>
        </section>
        <section v-if="game.status === 'gift' && game.pendingGift?.chooserId === playerId" class="mt-4 rounded-lg bg-amber-400 px-4 py-4 text-emerald-950">
          <p class="font-display text-lg font-bold">{{ game.pendingGift.targetId ? t('GAME.GIFT_CARD') : t('GAME.GIFT_TARGET') }}</p>
          <div v-if="!game.pendingGift.targetId" class="mt-3 flex flex-wrap gap-2">
            <button v-for="p in lobby.players.filter(x => x.id !== playerId && game && game.players[x.id])" :key="p.id" type="button" :class="[btn, 'bg-emerald-900 text-white']" @click="eventsEmitter.game.emitGiftTarget(p.id)">{{ p.name }} ({{ game.players[p.id]?.numCards ?? 0 }})</button>
          </div>
          <button type="button" class="mt-3 font-semibold underline" @click="eventsEmitter.game.emitCancelChoice()">{{ t('GAME.CANCEL_CHOICE') }}</button>
        </section>
        <section v-if="game.status === 'peeking' && game.pendingPeek?.chooserId === playerId" class="mt-4 rounded-lg bg-amber-400 px-4 py-4 text-emerald-950">
          <p class="font-display text-lg font-bold">{{ t('GAME.PEEK_TARGET') }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button v-for="p in lobby.players.filter(x => x.id !== playerId && game && game.players[x.id])" :key="p.id" type="button" :class="[btn, 'bg-emerald-900 text-white']" @click="eventsEmitter.game.emitPeekTarget(p.id)">{{ p.name }} ({{ game.players[p.id]?.numCards ?? 0 }})</button>
          </div>
          <button type="button" class="mt-3 font-semibold underline" @click="eventsEmitter.game.emitCancelChoice()">{{ t('GAME.CANCEL_CHOICE') }}</button>
        </section>
        <section v-if="['swapcard', 'gift', 'peeking'].includes(game.status) && game.currentPlayerId !== playerId" class="mt-4 rounded-lg bg-black/25 px-4 py-3 font-semibold">{{ t('GAME.WAITING_CHOICE', { name: turnName }) }}</section>
        <p v-if="game.lockedColor" class="mt-4 rounded-lg bg-black/25 px-4 py-3 font-semibold">🔒 {{ t('GAME.LOCKED', { name: nameOf(game.lockedBy ?? '') }) }} ({{ suitName(game.lockedColor) }})</p>
        <p v-if="(game.status === 'challenging' && game.pendingDrawFour?.victimId === playerId) || (game.status === 'penalty' && game.pendingPenalty?.victimId === playerId)" class="mt-2 text-sm font-semibold text-amber-200">{{ t('GAME.SHIELD_HINT') }}</p>

        <!-- Peeked hands -->
        <section v-for="(cards, pid) in game.revealedHands" :key="pid" class="mt-4">
          <h3 class="font-display font-bold">{{ t('GAME.REVEALED') }} — {{ nameOf(String(pid)) }}</h3>
          <div class="mt-2 flex flex-wrap gap-1">
            <PlayingCard v-for="c in cards" :key="c.id" :card="c" :hex="suitHex(c.color)" :suit-hexes="suitHexes" small />
          </div>
        </section>

        <!-- Table -->
        <section class="mt-6 flex items-start justify-center gap-8">
          <div class="flex flex-col items-center gap-2">
            <button type="button" :disabled="!isMyTurn || !!game.drawnCardId" class="flex h-24 w-[4.25rem] items-center justify-center rounded-lg border-4 border-white bg-emerald-950 font-display text-sm font-black shadow-lg focus:outline-none focus:ring-4 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60 sm:h-28 sm:w-20" @click="eventsEmitter.game.emitDrawCard()">{{ t('GAME.DRAW_PILE') }}</button>
            <span class="text-sm text-emerald-100/80">{{ game.drawPileCount }} {{ t('GAME.CARDS') }}</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <PlayingCard v-if="game.topCard" :key="`${game.topCard.id}-${game.discardCount}`" :card="game.topCard" :hex="suitHex(game.topCard.color)" :suit-hexes="suitHexes" />
            <span class="text-sm text-emerald-100/80">{{ t('GAME.DISCARD') }} ({{ game.discardCount }})</span>
          </div>
        </section>

        <!-- Wild colour picker -->
        <section v-if="pendingWild" class="mt-6 rounded-lg bg-black/30 px-4 py-4">
          <h2 class="font-display text-lg font-bold">{{ t('GAME.CHOOSE_COLOR') }}</h2>
          <div class="mt-3 flex gap-2">
            <button v-for="c in suits" :key="c.id" type="button" class="rounded-full px-5 py-2.5 font-display font-bold text-white focus:outline-none focus:ring-4 focus:ring-white/60" :style="{ background: c.hex }" @click="chooseColor(c.id)">{{ c.name }}</button>
            <button type="button" class="rounded-full px-4 py-2.5 font-semibold underline" @click="pendingWild = null">{{ t('HOME.CLOSE') }}</button>
          </div>
        </section>

        <!-- Hand -->
        <section v-if="!isSpectator" class="mt-8">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="font-display text-xl font-bold">{{ me?.name }} — {{ hand.length }} {{ t('GAME.CARDS') }}</h2>
            <button v-if="isMyTurn && game.drawnCardId" type="button" :class="[btn, 'bg-white text-emerald-950']" @click="eventsEmitter.game.emitPassTurn()">{{ t('GAME.PASS') }}</button>
            <span v-if="game.drawnCardId && isMyTurn" class="text-sm font-semibold text-amber-200">{{ t('GAME.PLAYABLE_ONLY') }}</span>
          </div>
          <div class="mt-4 flex flex-wrap px-2 pt-3">
            <div v-for="(card, i) in hand" :key="card.id" class="fan-card -ml-4 first:ml-0" :style="fanStyle(i, hand.length)">
              <PlayingCard :card="card" :hex="suitHex(card.color)" :suit-hexes="suitHexes" interactive :disabled="!playable(card)" :playable="playable(card)" @click="onCard(card)" />
            </div>
          </div>
          <p v-if="hand.length === 0" class="mt-3 text-emerald-100/80">No cards.</p>
        </section>
      </div>

      <aside class="rounded-lg bg-black/25 px-4 py-3 lg:self-start">
        <div class="flex items-baseline justify-between gap-2">
          <h2 class="font-display text-lg font-bold">{{ t('GAME.LOG') }}</h2>
          <span class="text-xs text-emerald-100/70">{{ game.log.length }} {{ t('GAME.EVENTS') }}</span>
        </div>
        <ul v-if="game.log.length" class="mt-2 max-h-[460px] space-y-1.5 overflow-y-auto pr-1 text-sm text-emerald-100/85">
          <li v-for="(line, i) in game.log" :key="`${i}-${line}`" class="rounded bg-black/20 px-2 py-1.5 leading-snug" :class="i === 0 ? 'log-new text-white' : ''">{{ line }}</li>
        </ul>
        <p v-else class="mt-2 text-sm text-emerald-100/70">{{ t('GAME.LOG_EMPTY') }}</p>
      </aside>
    </main>

    <BaseModal :title="t('GAME.EXIT_TITLE')" :show="showExit" :close-modal="() => showExit = false">
      <template #body>
        <p class="leading-relaxed">{{ t('GAME.EXIT_WARNING') }}</p>
      </template>
      <template #footer>
        <button type="button" :class="[btn, 'border border-neutral-300']" @click="showExit = false">{{ t('GAME.CANCEL') }}</button>
        <button type="button" :class="[btn, 'bg-red-600 text-white hover:bg-red-500']" @click="confirmExit">{{ t('GAME.EXIT_CONFIRM') }}</button>
      </template>
    </BaseModal>
  </div>
</template>
