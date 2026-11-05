<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'truck'">
      <path d="M3 7h11v8H3z" />
      <path d="M14 10h4l3 3v2h-7" />
      <circle cx="7" cy="17.5" r="1.4" />
      <circle cx="17" cy="17.5" r="1.4" />
    </template>
    <template v-else-if="name === 'key'">
      <circle cx="8" cy="15" r="3" />
      <path d="M10.8 13.8 20 6.5" />
      <path d="M16.5 8.2 18.2 10" />
      <path d="M14.2 10.2 15.8 11.8" />
    </template>
    <template v-else-if="name === 'gift'">
      <rect x="4" y="10" width="16" height="9" rx="1.5" />
      <path d="M4 14h16" />
      <path d="M12 10v9" />
      <path d="M12 10c-2 0-4-2.2-3-3.6S12 7.2 12 10c0-2.8 2.2-4.2 3-3.6S14 10 12 10Z" />
    </template>
    <template v-else-if="name === 'star'">
      <path d="m12 3.8 2.1 4.3 4.7.7-3.4 3.3.8 4.7L12 14.6 7.8 16.8l.8-4.7L5.2 8.8l4.7-.7L12 3.8Z" />
    </template>
    <template v-else-if="name === 'heart'">
      <path d="M12 19s-6.2-3.8-6.2-8.2A3.4 3.4 0 0 1 12 8.2a3.4 3.4 0 0 1 6.2 2.6C18.2 15.2 12 19 12 19Z" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </template>
    <template v-else-if="name === 'cart'">
      <circle cx="9" cy="19" r="1.3" />
      <circle cx="17" cy="19" r="1.3" />
      <path d="M3 5h2l2.2 9.2a1.5 1.5 0 0 0 1.5 1.1h7.8a1.5 1.5 0 0 0 1.5-1.1L20 8H7" />
    </template>
    <template v-else-if="name === 'tag'">
      <path d="M4 12.5 11.5 5H19v7.5L11.5 20 4 12.5Z" />
      <circle cx="15.5" cy="8.5" r="1.1" />
    </template>
    <template v-else-if="name === 'phone'">
      <path d="M8 4h3l1.2 3.2-1.8 1.1a12 12 0 0 0 5.3 5.3l1.1-1.8L20 13v3a2 2 0 0 1-2.2 2A15 15 0 0 1 6 6.2 2 2 0 0 1 8 4Z" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </template>
    <template v-else-if="name === 'help'">
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.7.3-1.2.9-1.2 1.6" />
      <path d="M12 17h.01" />
    </template>
    <template v-else-if="name === 'smile'">
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 13.5a4 4 0 0 0 7 0" />
      <path d="M9 9.5h.01" />
      <path d="M15 9.5h.01" />
    </template>
    <template v-else-if="name === 'box'">
      <path d="M3.5 8 12 4l8.5 4L12 12 3.5 8Z" />
      <path d="M3.5 8v8L12 20l8.5-4V8" />
      <path d="M12 12v8" />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </template>
    <template v-else-if="name === 'chat'">
      <path d="M8 10.5h8" />
      <path d="M8 14h5" />
      <path d="M7 18.5 4.5 21v-4.2A8.5 8.5 0 1 1 12 20.5" />
    </template>
    <template v-else>
      <path d="M12 3.5 13.4 8l4.6 1.4L13.4 11 12 15.5 10.6 11 6 9.4 10.6 8z" />
      <path d="M18 14.5 18.7 16.8 19.9 17.5 18.7 18.2 18 20.5 17.3 18.2 16.1 17.5 17.3 16.8z" />
    </template>
  </svg>
</template>

<script>
export default {
  name: 'OutsideBubbleIcon',
  props: {
    name: { type: String, default: 'sparkle' },
  },
}
</script>
