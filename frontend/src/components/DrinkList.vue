<!-- DrinkList: collection of DrinkSummaries plus ingredient lists -->

<template>
  <div class="section">
    <table class="drink-table" v-if="!loading">
      <tbody>
        <tr v-for="(drink, index) in drinks" v-bind:key="drink.drink">
          <DrinkInfo v-bind:drink_info="drink" v-model:expanded="drink.expanded"
            @replaceDrink="replaceDrink(index)"
          />
        </tr>
      </tbody>
    </table>
    
    <!-- <div class="drink-tail" :class="{hide: !drinksLoaded || loading}">{{ otherDrinksMsg }}</div> -->

    <div class="drinks-loading" v-if="loading">
      <!-- <img class="icon icon-big" src="../assets/dots-loading.gif"/> -->
      <div class="loading-placeholder drink-table-placeholder" v-if="loading">
        <div>loading drinks...</div>
      </div>
    </div>
    
    <!-- if ingredient list is brought back, should move to app-level component -->
    <!-- <div class="ingredient-list">
      <h1 v-if="all_ingredients.length > 0">Ingredients</h1>
      <table class="ingredient-table">
        <tbody>
          <tr v-for="ingredient_info in all_ingredients" v-bind:key="ingredient_info.full_str">
            <IngredientSummary v-bind:ingredient_info="ingredient_info"/>
          </tr>
        </tbody>
      </table>
    </div> -->
  </div>
</template>

<script>
const utils = require('../incl/utils')
import DrinkInfo from './DrinkInfo.vue'
// import IngredientSummary from './IngredientSummary.vue'
const _ = require('lodash')

// const MAX_DISPLAYED_DRINK_COUNT = 100

export default {
  name: 'DrinkList',
  props: {
    drinks: Array,
    // totalDrinksCount: Number,
    loading: Boolean,
    // drinksLoaded: Boolean,
    // showCountMsg: Boolean,
    // excluded_drinks: Array
  },
  emits: ['replaceDrink'],
  components: {
    DrinkInfo,
    // IngredientSummary
  },
  data() {
    return {
      all_ingredients: []
    }
  },
  computed: {
    // otherDrinksMsg() {
    //   if (!this.showCountMsg) return ''

    //   const other_drinks = this.totalDrinksCount - this.drinks.length
    //   const excluded_drinks_msg = this.excluded_drinks.length > 0 ?
    //     this.excluded_drinks.length > 1 ?
    //       ` (excluding ${this.excluded_drinks.length} drinks)` :
    //       ` (excluding ${this.excluded_drinks.length} drink)`
    //     : ''
        
      
    //   const other_drinks_count_str = other_drinks > MAX_DISPLAYED_DRINK_COUNT ?
    //     `${MAX_DISPLAYED_DRINK_COUNT}+` : String(other_drinks)

    //   const base_msg = this.drinks.length > 0 ?
    //     other_drinks > 0 ?
    //       `found ${other_drinks_count_str} other drinks` :
    //       `didn't find any other drinks` :  
    //     `Didn't find any drinks. Try widening your search?`
      
    //   return base_msg + excluded_drinks_msg
    // }
  },
  watch: {
    drinks: {
      handler(val) {
        // update all ingredients
        this.all_ingredients = _.chain(val)
          .map('recipe')
          .flatten() // combine all drinks' recipes into one list
          .map(ingredient => {
            const premods_str = _.map(ingredient.premods, mod => utils.desanitize(mod)).join(' ')
            const postmods_str = _.map(ingredient.postmods, mod => utils.desanitize(mod)).join(' ')
            const ingredient_str = utils.desanitize(ingredient.ingredient)
            return {
              premods_str,
              postmods_str,
              ingredient_str,
              full_str: `${premods_str} ${ingredient_str} ${postmods_str}`.trim(),
              ..._.pick(ingredient, ['preferred'])
            }
          })
          .uniqBy(ingredient => ingredient.full_str)
          .sortBy(['preferred', 'full_str'])
          .value()
      }
    }
  },
  methods: {
    replaceDrink(index) {
      this.$emit('replaceDrink', index)
    }
  }
}
</script>

<style scoped>
  table {
    display: inline-table;
    width: 100%
  }
  .drink-tail {
    margin-bottom: 20px;
    font-size: larger;
  }

  .drink-table-placeholder {
    height: 300px
  }
</style>
