<template>
  <div class="drink-list">
    <table>
      <tbody>
        <tr v-for="drink in drinks" v-bind:key="drink.drink">
          <DrinkSummary v-bind:drink_info="drink"/>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import DrinkSummary from './DrinkSummary.vue'

export default {
  name: 'DrinkList',
  props: {
    drinks: Array
  },
  components: {
    DrinkSummary
  }
}
</script>

<style scoped>

</style>
