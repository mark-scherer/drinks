<!-- IngredientSelector -->

<template>
  <div class="ingredient-selector">
    <!-- {{ ingredient_selection }} -->
    <Autocomplete v-model="ingredient_selection" :choices="ingredients"/>
  </div>
</template>

<script>
const _ = require('lodash')
import { desanitize } from '../utils'

import Autocomplete from './Autocomplete.vue'

export default {
  name: 'IngredientSelector',
  props: {
    ingredients_info: Array
  },
  components: {
    Autocomplete
  },
  data() {
    return {
      ingredients: [],
      ingredient_selection: []
    }
  },
  watch: {
    ingredients_info: {
      handler(val) {
        this.ingredients = _.map(val, ingredient_info => desanitize(ingredient_info.ingredient))
      }
    }
  }
}
</script>

<style scoped>
.ingredient-selector {
  width: 30%;
  margin: 0 auto;
}
</style>
