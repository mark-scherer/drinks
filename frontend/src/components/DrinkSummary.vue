<!-- DrinkSummary: basic overview of single drink -->

<template class="drink-summary">
  <div class="drink-summary">
    <div class="drink-info">
      <h1>{{desanitize(drink_info.drink, {capitalize: true})}}</h1>
      <div class = "ingredients">
        <p v-for="(ingredient_info, index) in drink_info.ingredient_info" v-bind:key="ingredient_info.ingredient">
          <template v-if="index > 0">, </template> <!-- jank way to add separator w/ v-for -->
          <span v-for="mod in ingredient_info.premods" v-bind:key="mod" class="mod">
            {{desanitize(mod)}}
            <span> </span>
          </span>
          <span>{{desanitize(ingredient_info.ingredient)}}</span>
          <span v-for="mod in ingredient_info.postmods" v-bind:key="mod" class="mod">
            {{desanitize(mod)}}
            <span> </span>
          </span>
        </p>
      </div>
    </div>
    <div class="drink-metadata">
      <div v-if="drink_info.category"><b>Category:</b> {{desanitize(drink_info.category)}}</div>
      <div v-if="drink_info.glass"><b>Glass:</b> {{desanitize(drink_info.glass)}}</div>
    </div>
  </div>
</template>

<script>
import * as utils from '../utils.js'

export default {
  name: 'DrinkSummary',
  props: {
    drink_info: Object
  },
  methods: {
    desanitize: utils.desanitize
  }
}
</script>

<style scoped>
  h1 {
    text-align: left;
    margin-bottom: 10px;
  }
  p {
    display: inline
  }
  .drink-summary {
    position: relative;
    overflow: auto;
    margin: 15px 0;
  }
  .ingredients {
    float: left;
    width: 65%;
    text-align: left;
  }
  .drink-metadata {
    float: right;
    width: 30%;
    text-align: left;
    position: absolute;
    bottom: 0px;
    right: 0px
  }
</style>
