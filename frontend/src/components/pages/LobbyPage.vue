<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { eventsEmitter, eventsListenersAdder, lobby, playerId } from '@/connection';
import { buildInviteLink } from '@/invite';
import type { Card, DeckColor } from '@/interfaces/Lobby';
import BaseModal from '../modal/BaseModal.vue';
import PlayerAvatar from '../PlayerAvatar.vue';
import PlayingCard from '../PlayingCard.vue';

const { t } = useI18n();
const me = computed(() => lobby.value?.players.find(p => p.id === playerId));
const isLeader = computed(() => !!me.value?.leader);
const showOptions = ref(false);
const confirmReset = ref(false);
const closeOptions = () => { showOptions.value = false; confirmReset.value = false; };
const resetOptions = () => { eventsEmitter.lobby.emitResetOptions(); confirmReset.value = false; };
const copied = ref(false);
const copiedLink = ref(false);
const inviteLink = computed(() => (lobby.value ? buildInviteLink(lobby.value.code, `${window.location.origin}${import.meta.env.BASE_URL || '/'}`) : ''));
if (typeof window !== 'undefined' && window.location.pathname.includes('/join/')) window.history.replaceState(null, '', import.meta.env.BASE_URL || '/');
const startError = ref('');
eventsListenersAdder.lobby.startGameError((type: string) => {
  startError.value = t(type === 'not-all-ready' ? 'LOBBY.ERRORS.NOT_ALL_READY' : type === 'not-enough-players' ? 'LOBBY.ERRORS.NOT_ENOUGH' : type === 'already-in-game' ? 'LOBBY.ERRORS.ALREADY' : type === 'deck-too-small' ? 'LOBBY.ERRORS.DECK_TOO_SMALL' : 'LOBBY.ERRORS.NOT_LEADER');
  setTimeout(() => startError.value = '', 4000);
});
const copyCode = async () => { try { await navigator.clipboard.writeText(lobby.value?.code ?? ''); copied.value = true; setTimeout(() => copied.value = false, 1500); } catch { /* clipboard unavailable */ } };
const copyLink = async () => { try { await navigator.clipboard.writeText(inviteLink.value); copiedLink.value = true; setTimeout(() => copiedLink.value = false, 1500); } catch { /* clipboard unavailable */ } };
const toggleReady = () => { if (me.value?.ready) eventsEmitter.lobby.emitUnready(); else eventsEmitter.lobby.emitReady(); };
const emitOptions = () => { if (lobby.value) eventsEmitter.lobby.emitUpdateOptions(JSON.parse(JSON.stringify(lobby.value.options))); };
const setTarget = (e: Event) => { if (!lobby.value) return; lobby.value.options.targetScore = Number((e.target as HTMLSelectElement).value); emitOptions(); };
const TURN_TIMES = [0, 10, 15, 20, 30, 45, 60];
const setTurnTime = (e: Event) => { if (!lobby.value) return; lobby.value.options.turnTimeSeconds = Number((e.target as HTMLSelectElement).value); emitOptions(); };
const setRule = (key: 'stackPenalty' | 'drawUntilPlayable' | 'swapOnSeven', e: Event) => { if (!lobby.value) return; lobby.value.options[key] = (e.target as HTMLInputElement).checked; emitOptions(); };
const enabledRules = computed(() => {
  const o = lobby.value?.options; if (!o) return [] as string[];
  return [o.stackPenalty ? t('LOBBY.STACK_PENALTY') : '', o.drawUntilPlayable ? t('LOBBY.DRAW_UNTIL') : '', o.swapOnSeven ? t('LOBBY.SWAP_SEVEN') : ''].filter(Boolean);
});
const RANDOM_PALETTE = [
  { name: 'Red', hex: '#dc2626' }, { name: 'Yellow', hex: '#facc15' }, { name: 'Green', hex: '#16a34a' }, { name: 'Blue', hex: '#2563eb' },
  { name: 'Purple', hex: '#7c3aed' }, { name: 'Pink', hex: '#db2777' }, { name: 'Teal', hex: '#0891b2' }, { name: 'Orange', hex: '#ea580c' }
];
const COLORED_SPECIALS: { key: 'skip' | 'reverse' | 'draw2' | 'draw1' | 'skipall' | 'reversedraw' | 'swapcard' | 'peek' | 'gift' | 'shield' | 'discardcolor' | 'lock'; kind: Card['kind']; label: string }[] = [
  { key: 'skip', kind: 'skip', label: 'LOBBY.SKIP' }, { key: 'reverse', kind: 'reverse', label: 'LOBBY.REVERSE' }, { key: 'draw2', kind: 'draw2', label: 'LOBBY.DRAW2' },
  { key: 'draw1', kind: 'draw1', label: 'LOBBY.DRAW1' }, { key: 'skipall', kind: 'skipall', label: 'LOBBY.SKIPALL' }, { key: 'reversedraw', kind: 'reversedraw', label: 'LOBBY.REVERSEDRAW' },
  { key: 'swapcard', kind: 'swapcard', label: 'LOBBY.SWAPCARD' }, { key: 'peek', kind: 'peek', label: 'LOBBY.PEEK' }, { key: 'gift', kind: 'gift', label: 'LOBBY.GIFT' },
  { key: 'shield', kind: 'shield', label: 'LOBBY.SHIELD' }, { key: 'discardcolor', kind: 'discardcolor', label: 'LOBBY.DISCARDCOLOR' }, { key: 'lock', kind: 'lock', label: 'LOBBY.LOCK' }
];
const emptySpecials = () => ({ draw1: 0, skipall: 0, reversedraw: 0, swapcard: 0, peek: 0, gift: 0, shield: 0, discardcolor: 0, lock: 0 });
const randomDeck = () => {
  const o = lobby.value?.options; if (!o) return;
  const rnd = (max: number) => Math.floor(Math.random() * (max + 1));
  for (let attempt = 0; attempt < 50; attempt++) {
    const palette = [...RANDOM_PALETTE].sort(() => Math.random() - 0.5).slice(0, 3 + rnd(3));
    const colors = palette.map((c, i) => ({
      id: i < 4 ? ['red', 'yellow', 'green', 'blue'][['Red', 'Yellow', 'Green', 'Blue'].indexOf(c.name)] ?? `custom-${i + 1}` : `custom-${i + 1}`,
      name: c.name, hex: c.hex,
      numbers: Array.from({ length: 10 }, (_, v) => ({ value: v, copies: Math.random() < 0.85 ? 1 + rnd(1) : -1 })).filter(n => n.copies > 0).map(n => ({ value: n.value, copies: n.copies })),
      skip: rnd(3), reverse: rnd(3), draw2: rnd(3),
      draw1: rnd(2), skipall: rnd(1), reversedraw: rnd(1), swapcard: rnd(1), peek: rnd(1), gift: rnd(1), shield: rnd(2), discardcolor: rnd(1), lock: rnd(1)
    }));
    if (colors.some(c => c.numbers.length < 4)) continue;
    const deckCfg = { colors, wildCount: rnd(8), wild4Count: rnd(8), wild2Count: rnd(4), copycatCount: rnd(3), bombCount: rnd(2), shuffleCount: rnd(2) };
    const size = colors.reduce((s, c) => s + c.numbers.reduce((a, n) => a + n.copies, 0) + COLORED_SPECIALS.reduce((a, k) => a + c[k.key], 0), 0) + deckCfg.wildCount + deckCfg.wild4Count + deckCfg.wild2Count + deckCfg.copycatCount + deckCfg.bombCount + deckCfg.shuffleCount;
    if (size < Math.max(40, (lobby.value?.players.length ?? 2) * o.handSize + 10)) continue;
    o.deck = deckCfg;
    emitOptions();
    return;
  }
};
const deck = computed(() => lobby.value?.options.deck);
const deckSize = computed(() => {
  const d = deck.value; if (!d) return 0;
  return d.colors.reduce((sum, c) => sum + c.numbers.reduce((s, n) => s + n.copies, 0) + COLORED_SPECIALS.reduce((a, k) => a + c[k.key], 0), 0) + d.wildCount + d.wild4Count + d.wild2Count + d.copycatCount + d.bombCount + d.shuffleCount;
});
const colorSpecialsSummary = (color: DeckColor) => COLORED_SPECIALS.filter(s => color[s.key] > 0).map(s => `${t(s.label)} ${color[s.key]}`).join(' · ');
const deckTooSmall = computed(() => !!lobby.value && deckSize.value < lobby.value.players.length * lobby.value.options.handSize + 1);
const numberEntry = (color: DeckColor, v: number) => color.numbers.find(n => n.value === v);
const clampCount = (raw: string, min: number) => { const n = Math.floor(Number(raw)); return Number.isFinite(n) ? Math.min(99, Math.max(min, n)) : min; };
const addNumber = (color: DeckColor, v: number) => { if (numberEntry(color, v)) return; color.numbers.push({ value: v, copies: 1 }); color.numbers.sort((a, b) => a.value - b.value); emitOptions(); };
const removeNumber = (color: DeckColor, v: number) => { color.numbers = color.numbers.filter(n => n.value !== v); emitOptions(); };
const setNumberCopies = (color: DeckColor, v: number, e: Event) => {
  const input = e.target as HTMLInputElement;
  const entry = numberEntry(color, v); if (!entry) return;
  entry.copies = clampCount(input.value, 1);
  input.value = String(entry.copies);
  emitOptions();
};
const previewCard = (color: DeckColor, kind: Card['kind'], value?: number): Card => ({ id: `preview-${color.id}-${kind}-${value ?? ''}`, color: color.id, kind, value });
const firstSuitHexes = () => deck.value?.colors.map(c => c.hex) ?? [];
const NEW_COLOR_HEX = ['#7c3aed', '#db2777', '#0891b2', '#ea580c', '#65a30d', '#475569'];
const addColor = () => {
  const d = deck.value; if (!d || d.colors.length >= 8) return;
  const n = d.colors.length + 1;
  let id = `custom-${n}`; let k = n;
  while (d.colors.some(c => c.id === id)) { k += 1; id = `custom-${k}`; }
  d.colors.push({ id, name: `Colour ${n}`, hex: NEW_COLOR_HEX[(n - 4 + NEW_COLOR_HEX.length) % NEW_COLOR_HEX.length], numbers: [{ value: 0, copies: 1 }, ...Array.from({ length: 9 }, (_, i) => ({ value: i + 1, copies: 2 }))], skip: 2, reverse: 2, draw2: 2, ...emptySpecials() });
  emitOptions();
};
const removeColor = (color: DeckColor) => { const d = deck.value; if (!d || d.colors.length <= 2) return; d.colors = d.colors.filter(c => c.id !== color.id); emitOptions(); };
const setColorSpecial = (color: DeckColor, key: (typeof COLORED_SPECIALS)[number]['key'], e: Event) => {
  const input = e.target as HTMLInputElement;
  color[key] = clampCount(input.value, 0);
  input.value = String(color[key]);
  emitOptions();
};
const WILD_FIELDS: { key: 'wildCount' | 'wild4Count' | 'wild2Count' | 'copycatCount' | 'bombCount' | 'shuffleCount'; kind: Card['kind']; label: string }[] = [
  { key: 'wildCount', kind: 'wild', label: 'LOBBY.WILD' }, { key: 'wild4Count', kind: 'wild4', label: 'LOBBY.WILD4' },
  { key: 'wild2Count', kind: 'wild2', label: 'LOBBY.WILD2' }, { key: 'copycatCount', kind: 'copycat', label: 'LOBBY.COPYCAT' },
  { key: 'bombCount', kind: 'bomb', label: 'LOBBY.BOMB' }, { key: 'shuffleCount', kind: 'shuffle', label: 'LOBBY.SHUFFLE' }
];
const setWild = (key: (typeof WILD_FIELDS)[number]['key'], e: Event) => {
  const input = e.target as HTMLInputElement;
  const d = deck.value; if (!d) return;
  d[key] = clampCount(input.value, 0);
  input.value = String(d[key]);
  emitOptions();
};
const specialPreview = (kind: Card['kind']): Card => ({ id: `preview-${kind}`, color: 'wild', kind });
const btn = 'rounded-full px-5 py-2.5 font-display font-bold focus:outline-none focus:ring-4';
</script>
<template>
  <div v-if="lobby" class="card-table flex min-h-screen w-full flex-col text-white">
    <header class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
      <span class="font-display text-2xl font-black">Twist</span>
      <button type="button" class="text-sm font-semibold text-emerald-100/85 underline hover:text-white" @click="eventsEmitter.general.emitLogout()">{{ t('LOBBY.LEAVE') }}</button>
    </header>
    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <h1 class="font-display text-3xl font-bold">{{ t('LOBBY.TITLE') }}</h1>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <span class="text-emerald-100/80">{{ t('LOBBY.CODE') }}:</span>
        <code class="rounded-lg bg-black/30 px-3 py-1 font-mono text-xl font-bold tracking-widest">{{ lobby.code }}</code>
        <button type="button" :class="[btn, 'bg-white/15 py-1.5 text-sm text-white hover:bg-white/25']" @click="copyCode">{{ copied ? t('LOBBY.COPIED') : t('LOBBY.COPY') }}</button>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <span class="text-emerald-100/80">{{ t('LOBBY.INVITE_LINK') }}:</span>
        <input :value="inviteLink" readonly aria-label="Invite link" class="min-w-0 flex-1 rounded-lg bg-black/30 px-3 py-1.5 text-sm text-emerald-50 focus:outline-none focus:ring-2 focus:ring-white/40 sm:max-w-md" @focus="($event.target as HTMLInputElement).select()">
        <button type="button" :class="[btn, 'bg-amber-400 py-1.5 text-sm font-black text-emerald-950 hover:bg-amber-300']" @click="copyLink">{{ copiedLink ? t('LOBBY.COPIED') : t('LOBBY.COPY_LINK') }}</button>
      </div>
      <p class="mt-2 text-sm text-emerald-100/70">{{ t('LOBBY.SHARE_HINT') }}</p>

      <ul class="mt-6 grid gap-3 sm:grid-cols-2">
        <li v-for="p in lobby.players" :key="p.id" class="flex items-center gap-3 rounded-lg bg-black/25 px-4 py-3">
          <PlayerAvatar :emote="p.emote" :color="p.color" />
          <span class="font-semibold">{{ p.name }}</span>
          <span v-if="p.id === me?.id" class="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">{{ t('LOBBY.YOU') }}</span>
          <span v-if="p.leader" class="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-emerald-950">{{ t('LOBBY.LEADER') }}</span>
          <span v-if="p.bot" class="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">{{ t('LOBBY.BOT') }}</span>
          <span v-if="p.spectator" class="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">{{ t('LOBBY.SPECTATOR') }}</span>
          <span class="ml-auto text-sm" :class="p.leader || p.ready ? 'text-emerald-300' : 'text-emerald-100/60'">{{ p.leader ? '—' : p.ready ? t('LOBBY.READY') : t('LOBBY.UNREADY') }}</span>
          <button v-if="isLeader && p.bot" type="button" class="text-sm underline hover:text-white" @click="eventsEmitter.lobby.emitRemoveBot(p.id)">{{ t('LOBBY.REMOVE') }}</button>
        </li>
      </ul>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <span class="rounded-full bg-black/25 px-3 py-1 text-sm font-semibold">{{ t('LOBBY.TARGET') }} {{ lobby.options.targetScore }} · {{ t('LOBBY.TURN_TIME') }}: {{ lobby.options.turnTimeSeconds === 0 ? t('LOBBY.NO_LIMIT') : `${lobby.options.turnTimeSeconds}s` }} · {{ t('LOBBY.DECK_SIZE', { n: deckSize }) }}</span>
        <span v-if="deck" class="flex items-center gap-1">
          <span v-for="color in deck.colors" :key="color.id" class="h-4 w-4 rounded" :style="{ background: color.hex }" :title="color.name" />
        </span>
        <button type="button" :class="[btn, 'bg-white/15 py-1.5 text-sm text-white hover:bg-white/25']" @click="showOptions = true">{{ t('LOBBY.OPTIONS') }}</button>
        <button v-if="isLeader" type="button" :class="[btn, 'bg-white/15 py-1.5 text-sm text-white hover:bg-white/25 ml-auto']" @click="eventsEmitter.lobby.emitAddBot()">{{ t('LOBBY.ADD_BOT') }}</button>
      </div>

      <p v-if="startError" role="alert" class="mt-4 rounded-lg bg-red-900/50 px-4 py-3 font-semibold text-red-200">{{ startError }}</p>

      <div class="mt-8 flex flex-wrap gap-3">
        <button v-if="!isLeader" type="button" :class="[btn, me?.ready ? 'bg-white/20 text-white' : 'bg-amber-400 text-emerald-950 hover:bg-amber-300']" @click="toggleReady">{{ me?.ready ? t('LOBBY.UNREADY') : t('LOBBY.READY') }}</button>
        <button v-if="isLeader" type="button" :class="[btn, 'bg-amber-400 text-emerald-950 hover:bg-amber-300 focus:ring-amber-200/60']" @click="eventsEmitter.lobby.emitStartGameRequest()">{{ t('LOBBY.START') }}</button>
        <span class="self-center text-sm text-emerald-100/75">{{ t('LOBBY.WAITING') }} {{ lobby.players.length }}/10</span>
      </div>
    </main>

    <BaseModal :title="t('LOBBY.OPTIONS')" :show="showOptions" :close-modal="closeOptions" wide dark>
      <template #body>
        <div v-if="isLeader" class="flex flex-wrap items-center gap-3">
          <label class="font-semibold" for="target">{{ t('LOBBY.TARGET') }}</label>
          <select id="target" class="rounded-lg bg-white px-3 py-2 font-semibold text-neutral-900" :value="lobby.options.targetScore" @change="setTarget">
            <option v-for="n in [100, 200, 300, 500]" :key="n" :value="n">{{ n }}</option>
          </select>
          <span class="text-emerald-100/80">{{ t('LOBBY.POINTS') }}</span>
          <label class="font-semibold" for="turntime">{{ t('LOBBY.TURN_TIME') }}</label>
          <select id="turntime" class="rounded-lg bg-white px-3 py-2 font-semibold text-neutral-900" :value="lobby.options.turnTimeSeconds" @change="setTurnTime">
            <option v-for="s in TURN_TIMES" :key="s" :value="s">{{ s === 0 ? t('LOBBY.NO_LIMIT') : `${s} ${t('LOBBY.SECONDS')}` }}</option>
          </select>
        </div>
        <p v-else class="text-sm text-emerald-100/85">{{ t('LOBBY.TARGET') }} {{ lobby.options.targetScore }} {{ t('LOBBY.POINTS') }} · {{ t('LOBBY.TURN_TIME') }}: {{ lobby.options.turnTimeSeconds === 0 ? t('LOBBY.NO_LIMIT') : `${lobby.options.turnTimeSeconds} ${t('LOBBY.SECONDS')}` }}</p>

        <div class="mt-5">
          <h3 class="font-display text-lg font-bold">{{ t('LOBBY.HOUSE_RULES') }}</h3>
          <div v-if="isLeader" class="mt-2 space-y-2">
            <label class="flex cursor-pointer items-center gap-3 rounded-lg bg-black/25 px-3 py-2.5">
              <input type="checkbox" class="h-5 w-5 accent-amber-400" :checked="lobby.options.stackPenalty" @change="setRule('stackPenalty', $event)">
              <span class="font-semibold">{{ t('LOBBY.STACK_PENALTY') }}</span>
            </label>
            <label class="flex cursor-pointer items-center gap-3 rounded-lg bg-black/25 px-3 py-2.5">
              <input type="checkbox" class="h-5 w-5 accent-amber-400" :checked="lobby.options.drawUntilPlayable" @change="setRule('drawUntilPlayable', $event)">
              <span class="font-semibold">{{ t('LOBBY.DRAW_UNTIL') }}</span>
            </label>
            <label class="flex cursor-pointer items-center gap-3 rounded-lg bg-black/25 px-3 py-2.5">
              <input type="checkbox" class="h-5 w-5 accent-amber-400" :checked="lobby.options.swapOnSeven" @change="setRule('swapOnSeven', $event)">
              <span class="font-semibold">{{ t('LOBBY.SWAP_SEVEN') }}</span>
            </label>
          </div>
          <p v-else class="mt-2 text-sm text-emerald-100/85">{{ enabledRules.length ? enabledRules.join(' · ') : t('LOBBY.NO_HOUSE_RULES') }}</p>
        </div>

        <section v-if="deck" class="mt-5">
          <div class="flex flex-wrap items-center gap-3">
            <h3 class="font-display text-lg font-bold">{{ t('LOBBY.DECK') }}</h3>
            <span class="rounded-full bg-white/15 px-2 py-0.5 text-sm font-semibold">{{ t('LOBBY.DECK_SIZE', { n: deckSize }) }}</span>
            <button v-if="isLeader" type="button" :class="[btn, 'bg-white/15 py-1.5 text-sm text-white hover:bg-white/25 ml-auto']" @click="randomDeck">{{ t('LOBBY.RANDOM_DECK') }}</button>
            <button v-if="isLeader && deck.colors.length < 8" type="button" :class="[btn, 'bg-white/15 py-1.5 text-sm text-white hover:bg-white/25']" @click="addColor">{{ t('LOBBY.ADD_COLOR') }}</button>
          </div>
          <p v-if="deckTooSmall" role="alert" class="mt-2 rounded-lg bg-red-900/50 px-3 py-2 text-sm font-semibold text-red-200">{{ t('LOBBY.DECK_TOO_SMALL_HINT') }}</p>

          <div v-if="isLeader">
            <div v-for="color in deck.colors" :key="color.id" class="mt-3 rounded-lg bg-black/25 px-3 py-3">
              <div class="flex flex-wrap items-center gap-2">
                <input type="color" :value="color.hex" :aria-label="t('LOBBY.COLOR_NAME')" class="h-9 w-12 cursor-pointer rounded bg-white p-0.5" @change="color.hex = ($event.target as HTMLInputElement).value; emitOptions()">
                <input :value="color.name" :aria-label="t('LOBBY.COLOR_NAME')" maxlength="20" class="w-36 rounded-lg px-2 py-1.5 font-semibold text-neutral-900" @change="color.name = ($event.target as HTMLInputElement).value; emitOptions()">
                <span class="text-sm text-emerald-100/75">{{ color.numbers.reduce((s, n) => s + n.copies, 0) }} number cards</span>
                <button v-if="deck.colors.length > 2" type="button" class="ml-auto text-sm underline hover:text-white" @click="removeColor(color)">{{ t('LOBBY.REMOVE_COLOR') }}</button>
              </div>
              <div class="mt-3 flex flex-wrap gap-3">
                <div v-for="v in 10" :key="v - 1" class="flex w-[4.5rem] flex-col items-center gap-1.5">
                  <div :class="numberEntry(color, v - 1) ? '' : 'opacity-35 grayscale'">
                    <PlayingCard :card="previewCard(color, 'number', v - 1)" :hex="color.hex" small />
                  </div>
                  <template v-if="numberEntry(color, v - 1)">
                    <label class="sr-only" :for="`copies-${color.id}-${v - 1}`">{{ t('LOBBY.CARD_COUNT') }}</label>
                    <input :id="`copies-${color.id}-${v - 1}`" type="number" min="1" max="99" step="1" :value="numberEntry(color, v - 1)!.copies" class="w-full rounded-lg px-1 py-1 text-center font-semibold text-neutral-900" @change="setNumberCopies(color, v - 1, $event)">
                    <button type="button" class="text-xs underline text-emerald-100/75 hover:text-white" @click="removeNumber(color, v - 1)">{{ t('LOBBY.REMOVE_CARD') }}</button>
                  </template>
                  <button v-else type="button" :class="[btn, 'bg-white/15 px-3 py-1 text-xs text-white hover:bg-white/25']" @click="addNumber(color, v - 1)">{{ t('LOBBY.ADD_CARD') }}</button>
                </div>
              </div>

              <h5 class="mt-4 font-display text-sm font-bold">{{ t('LOBBY.SPECIALS') }}</h5>
              <div class="mt-2 flex flex-wrap gap-3">
                <div v-for="s in COLORED_SPECIALS" :key="s.key" class="flex w-[4.5rem] flex-col items-center gap-1.5">
                  <PlayingCard :card="previewCard(color, s.kind)" :hex="color.hex" :suit-hexes="firstSuitHexes()" small />
                  <span class="text-center text-xs font-semibold">{{ t(s.label) }}</span>
                  <label class="sr-only" :for="`special-${color.id}-${s.key}`">{{ t('LOBBY.CARD_COUNT') }}</label>
                  <input :id="`special-${color.id}-${s.key}`" type="number" min="0" max="99" step="1" :value="color[s.key]" class="w-full rounded-lg px-1 py-1 text-center font-semibold text-neutral-900" @change="setColorSpecial(color, s.key, $event)">
                </div>
              </div>
            </div>
            <p class="mt-2 text-xs text-emerald-100/65">{{ t('LOBBY.NUMBERS_HINT') }}</p>

            <h4 class="mt-5 font-display font-bold">{{ t('LOBBY.WILD_CARDS') }}</h4>
            <div class="mt-3 flex flex-wrap gap-3">
              <div v-for="w in WILD_FIELDS" :key="w.key" class="flex w-[4.5rem] flex-col items-center gap-1.5">
                <PlayingCard :card="specialPreview(w.kind)" :suit-hexes="firstSuitHexes()" small />
                <span class="text-center text-xs font-semibold">{{ t(w.label) }}</span>
                <label class="sr-only" :for="`special-${w.key}`">{{ t('LOBBY.CARD_COUNT') }}</label>
                <input :id="`special-${w.key}`" type="number" min="0" max="99" step="1" :value="deck[w.key]" class="w-full rounded-lg px-1 py-1 text-center font-semibold text-neutral-900" @change="setWild(w.key, $event)">
              </div>
            </div>
          </div>

          <ul v-else class="mt-3 space-y-2">
            <li v-for="color in deck.colors" :key="color.id" class="flex flex-wrap items-center gap-2 text-sm">
              <span class="h-4 w-4 rounded" :style="{ background: color.hex }" />
              <span class="font-semibold">{{ color.name }}</span>
              <span class="text-emerald-100/75">{{ color.numbers.map(n => `${n.value}×${n.copies}`).join(' ') || '—' }}<span v-if="colorSpecialsSummary(color)"> · {{ colorSpecialsSummary(color) }}</span></span>
            </li>
            <li class="text-sm text-emerald-100/75">{{ t('LOBBY.WILD_CARDS') }}: {{ WILD_FIELDS.filter(w => (deck?.[w.key] ?? 0) > 0).map(w => `${t(w.label)} ${deck?.[w.key] ?? 0}`).join(' · ') || '—' }}</li>
          </ul>
        </section>
      </template>
      <template #footer>
        <template v-if="isLeader && !confirmReset">
          <button type="button" :class="[btn, 'bg-red-500/85 text-white hover:bg-red-400 mr-auto']" @click="confirmReset = true">{{ t('LOBBY.RESET_DEFAULTS') }}</button>
        </template>
        <template v-else-if="isLeader">
          <span class="mr-auto self-center text-sm font-semibold text-red-200">{{ t('LOBBY.RESET_WARNING') }}</span>
          <button type="button" :class="[btn, 'bg-white/15 text-white hover:bg-white/25']" @click="confirmReset = false">{{ t('GAME.CANCEL') }}</button>
          <button type="button" :class="[btn, 'bg-red-500 text-white hover:bg-red-400']" @click="resetOptions">{{ t('LOBBY.RESET_CONFIRM') }}</button>
        </template>
        <button type="button" :class="[btn, 'bg-amber-400 text-emerald-950 hover:bg-amber-300']" @click="closeOptions">{{ t('HOME.CLOSE') }}</button>
      </template>
    </BaseModal>
  </div>
</template>
