<!-- DrinkList: collection of DrinkSummaries plus ingredient lists -->

<template>
  <div class="drink-list">
    <table class="drink-table">
      <tbody>
        <tr v-for="drink in drinks" v-bind:key="drink.drink">
          <DrinkSummary v-bind:drink_info="drink"/>
        </tr>
      </tbody>
    </table>
    <table class="ingredient-table">
      <tbody>
        <tr v-for="ingredient_info in all_ingredients" v-bind:key="ingredient_info.full_str">
          <IngredientSummary v-bind:ingredient_info="ingredient_info"/>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { desanitize } from '../utils'
import DrinkSummary from './DrinkSummary.vue'
import IngredientSummary from './IngredientSummary.vue'
const _ = require('lodash')

export default {
  name: 'DrinkList',
  props: {
    drinks: Array
  },
  components: {
    DrinkSummary,
    IngredientSummary
  },
  data() {
    return {
      all_ingredients: []
    }
  },
  watch: {
    drinks: {
      handler(val) {
        this.all_ingredients = _.chain(val)
          .map(drink => drink.ingredient_info)
          .flatten()
          .map(ingredient_info => {
            const premods_str = _.map(ingredient_info.premods, mod => desanitize(mod)).join(' ')
            const postmods_str = _.map(ingredient_info.postmods, mod => desanitize(mod)).join(' ')
            const ingredient_str = desanitize(ingredient_info.ingredient)
            return {
              premods_str,
              postmods_str,
              ingredient_str,
              full_str: `${premods_str} ${ingredient_str} ${postmods_str}`.trim()
            }
          })
          .uniqBy(ingredient_info => ingredient_info.full_str)
          .sortBy(ingredient_info => ingredient_info.full_str)
          .value()
      }
    }
  }
}
</script>

<style scoped>
  .drink-list {
    margin: 0px auto;
  }
  table {
    display: inline-table;
    width: 100%
  }
</style>

<style>
  .mod {
    color: red;
  }
</style>
