<!-- IngredientSummary: basic overview of ingredients -->

<template>
  <div class="ingredient-summary" :class="{preferred: ingredient_info.preferred }">
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
const utils = require('../incl/utils')

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
  .ingredient-summary.preferred {
    background: #ccf7c6;
  }
  .ingredient-summary:not(.preferred) {
    background: #ffe0e0;
  }
</style>
