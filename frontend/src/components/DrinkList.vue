<!-- DrinkList: collection of DrinkSummaries plus ingredient lists -->

<template>
  <div class="drink-list">
    <table class="drink-table">
      <tbody>
        <tr v-for="drink in drinks" v-bind:key="drink.drink">
          <DrinkInfo v-bind:drink_info="drink" v-model="drink.expanded"/>
        </tr>
      </tbody>
    </table>
    
    <div class="drink-tail" :class="{hide: !drinksLoaded || loading}">{{ otherDrinksMsg }}</div>

    <div class="drinks-loading" :class="{hide: !loading}">
      <img class="icon-big" src="../assets/dots-loading.gif"/>
    </div>
    
    <div class="ingredient-list">
      <h1 v-if="all_ingredients.length > 0">Ingredients</h1>
      <table class="ingredient-table">
        <tbody>
          <tr v-for="ingredient_info in all_ingredients" v-bind:key="ingredient_info.full_str">
            <IngredientSummary v-bind:ingredient_info="ingredient_info"/>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { desanitize } from '../utils'
import DrinkInfo from './DrinkInfo.vue'
import IngredientSummary from './IngredientSummary.vue'
const _ = require('lodash')

export default {
  name: 'DrinkList',
  props: {
    drinks: Array,
    totalDrinksCount: Number,
    loading: Boolean,
    drinksLoaded: Boolean
  },
  components: {
    DrinkInfo,
    IngredientSummary
  },
  data() {
    return {
      all_ingredients: []
    }
  },
  computed: {
    otherDrinksMsg() {
      const other_drinks = this.totalDrinksCount - this.drinks.length
      return this.drinks.length > 0 ?
        other_drinks > 0 ?
          `found ${other_drinks} other drinks` :
          `didn't find any other drinks` :  
        `Didn't find any drinks. Try widening your search?`
    }
  },
  watch: {
    drinks: {
      handler(val) {
        // update all ingredients
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
              full_str: `${premods_str} ${ingredient_str} ${postmods_str}`.trim(),
              ..._.pick(ingredient_info, ['preferred'])
            }
          })
          .uniqBy(ingredient_info => ingredient_info.full_str)
          .sortBy(['preferred', 'full_str'])
          .value()
      }
    }
  }
}
</script>

<style scoped>
  .drink-list {
    margin: 0px auto;
    max-width: 600px;
  }
  .drink-tail {
    margin-bottom: 20px;
    font-size: larger;
  }
  .ingredient-list h1 {
    font-size: x-large;
    margin-bottom: 10px;
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
