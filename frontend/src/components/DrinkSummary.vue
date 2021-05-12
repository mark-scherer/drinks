<template>
  <div>
    <h1>Drink: {{drink_info.drink}}</h1>
    <p>{{ JSON.stringify(drink_info) }}</p>
  </div>
</template>

<script>
export default {
  name: 'DrinkSummary',
  props: {
    drink_info: Object
  },
}
</script>

<style scoped>

</style>
