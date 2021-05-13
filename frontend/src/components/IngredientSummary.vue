<!-- IngredientSummary: basic overview of ingredient -->

<template>
  <div class="ingredient-summary">
    <template v-if="ingredient_info.premods_str.length > 0" class="mod">
      <span class="mod">
        {{ingredient_info.premods_str}}
        <span> </span>
      </span>
      </template>
      <span>{{ingredient_info.ingredient_str}}</span>
      <template v-if="ingredient_info.postmods_str.length > 0">
      <span class="mod">
        <span> </span>
        {{ingredient_info.postmods_str}}
      </span>
      </template>
  </div>
</template>

<script>
import * as utils from '../utils.js'

export default {
  name: 'IngredientSummary',
  props: {
    ingredient_info: Object
  },
  methods: {
    desanitize: utils.desanitize
  }
}
</script>

<style scoped>
  
</style>
