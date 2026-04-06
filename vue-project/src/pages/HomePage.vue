<script setup>
// HomePage is just content now.
// Landing animation and background are handled globally in App.vue.
</script>

<template>
  <div class="home">
    <!-- Your home page content goes here -->
    <slot />
  </div>
</template>

<style scoped>
.home {
  position: relative;
  z-index: 1;
}
</style>
