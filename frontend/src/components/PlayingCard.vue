<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '@/interfaces/Lobby';
const props = defineProps<{ card: Card; interactive?: boolean; disabled?: boolean; playable?: boolean; small?: boolean; hex?: string; suitHexes?: string[] }>();
const emit = defineEmits(['click']);
const colorClass: Record<string, string> = {
  red: 'bg-red-600', yellow: 'bg-yellow-400', green: 'bg-green-600', blue: 'bg-blue-600', wild: 'bg-neutral-900'
};
const bgStyle = computed(() => (props.hex ? { background: props.hex } : undefined));
const label = computed(() => {
  if (props.card.kind === 'number') return String(props.card.value);
  return {
    skip: '⊘', reverse: '⇄', draw2: '+2', wild: 'Wild', wild4: '+4',
    draw1: '+1', skipall: 'All', reversedraw: '⇄+1', wild2: '+2', swapcard: 'Swap',
    peek: 'Peek', gift: 'Gift', shield: 'Shield', discardcolor: 'Drop', copycat: 'Copy', bomb: 'Bomb', shuffle: 'Mix', lock: 'Lock'
  }[props.card.kind];
});
const sub = computed(() => props.card.kind === 'wild' ? 'WILD' : props.card.kind === 'wild4' ? 'WILD' : props.card.kind);
const wildSquares = computed(() => (props.suitHexes?.length ? props.suitHexes.slice(0, 8) : ['#ef4444', '#facc15', '#22c55e', '#3b82f6']));
</script>
<template>
  <component
    :is="interactive ? 'button' : 'div'"
    :type="interactive ? 'button' : undefined"
    :disabled="interactive ? disabled : undefined"
    class="card-enter relative shrink-0 overflow-hidden rounded-lg border-4 border-white text-white shadow-lg"
    :class="[hex ? '' : colorClass[card.color], small ? 'h-20 w-14' : 'h-24 w-[4.25rem] sm:h-28 sm:w-20', interactive && !disabled ? 'cursor-pointer hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-white/70 transition-transform' : '', disabled ? 'cursor-not-allowed' : '', playable ? 'ring-4 ring-white ring-offset-2 ring-offset-emerald-900' : '']"
    :style="bgStyle"
    :aria-label="`${card.color} ${label}`"
    @click="interactive && emit('click')"
  >
    <span class="absolute inset-x-2 top-1/2 h-10 -translate-y-1/2 -rotate-12 rounded-[50%] bg-white/95" />
    <span class="absolute left-1 top-0.5 text-xs font-black drop-shadow">{{ label }}</span>
    <span class="absolute inset-0 flex items-center justify-center text-2xl font-black drop-shadow" :class="card.color === 'wild' ? 'text-white mix-blend-normal [text-shadow:0_1px_3px_rgba(0,0,0,.7)]' : ''">
      <span :style="hex ? { color: hex } : ''" :class="hex ? '' : card.color === 'red' ? 'text-red-600' : card.color === 'yellow' ? 'text-yellow-500' : card.color === 'green' ? 'text-green-700' : card.color === 'blue' ? 'text-blue-700' : 'text-white'">{{ label }}</span>
    </span>
    <span class="absolute bottom-0.5 right-1 rotate-180 text-xs font-black drop-shadow">{{ label }}</span>
    <span v-if="card.color === 'wild'" class="absolute bottom-1 left-1 grid grid-cols-2 gap-0.5">
      <span v-for="(h, i) in wildSquares" :key="i" class="h-2 w-2 rounded-sm" :style="{ background: h }" />
    </span>
    <span class="sr-only">{{ sub }}</span>
  </component>
</template>
