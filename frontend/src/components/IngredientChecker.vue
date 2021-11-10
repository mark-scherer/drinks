<!-- IngredientChecker: section confirming user has access to ingredients for suggested drinks -->

<template>
  <div class="section">

    <!-- content when not loading -->
    <form v-if="!loadingDrinks"> 
      <div class="section-header">
        <div>Missing any of these ingredients?</div>
      </div> 

      <div class="section-body">
        <div v-for="(ingredient, index) in ingredientsToCheck" :key="ingredient" class="ingredient-checkbox">
          <input 
            type ="checkbox" 
            :id="formatCheckboxId(index)" 
            @click="ingredientClicked(index, $event.target.checked)"
          >
          <label :for="formatCheckboxId(index)">{{ formatIngredient(ingredient) }}</label>
        </div>
      </div>

      <div class="section-footer">
        <div class="button" @click="submitClicked">{{ submitMessage }}</div>
      </div> 
    </form>

    <!-- content when loading -->
    <div v-if="loadingDrinks" class="loading-placeholder">
      <img class="icon icon-big loading-spinner" src="../assets/spinner_logo.png"/>
      loading drinks ...
    </div>

  </div>
</template>

<script>
import { desanitize } from '../incl/utils'
// const _ = require('lodash')
// const utils = require('../incl/utils')


export default {
  name: 'IngredientChecker',
  props: {

    /* inputs */
    ingredientsToCheck: {
      type: Array,
      required: true,
      description: 'list of ingredients to ask user if available'
    },

    /* outputs */
    // outputs emitted thru 'checked' event

    /* display control */
    loadingDrinks: {
      type: Boolean,
      required: true,
      description: 'if IngredientChecker should display loading message'
    },
    knownAvailableIngredients: {
      type: Number,
      required: true,
      description: 'number of ingredients user has indicated available in previous rounds'
    },
    knownUnavailableIngredients: {
      type: Number,
      required: true,
      description: 'number of ingredients user has indicated unavailable in previous rounds'
    }
  },
  data() {
    return {
      unavailableIngredients: []
    }
  },
  emits: ['checked'],
  methods: {
    ingredientClicked(index, checked) {
      if (checked) {
        this.unavailableIngredients.push(this.ingredientsToCheck[index])
      }
      else {
        this.unavailableIngredients.splice(this.unavailableIngredients.indexOf(this.ingredientsToCheck[index]), 1)
      }
    },
    submitClicked() {
      const _availableIngredients = this.ingredientsToCheck.filter(ingredient => !this.unavailableIngredients.includes(ingredient))
      const _unavailableIngredients = this.unavailableIngredients
      this.unavailableIngredients = []
      
      this.$emit('checked', {_availableIngredients, _unavailableIngredients})
    },

    formatIngredient(ingredient) {
      return desanitize(ingredient)
    },
    formatCheckboxId(index) {
      return `ingredient_checkbox_${index}`
    }
  },
  computed: {
    submitMessage: function() {
      return this.unavailableIngredients.length > 0 ?
          this.unavailableIngredients.length === 1 ?
            'I\'m missing this one' :
            `I'm missing these ${this.unavailableIngredients.length}` :
        'I\'ve got them all'
    }
  },
}
</script>

<style scoped>
.section-body {
  display: inline-block;
  margin: 15px;
}
.section-footer {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: stretch;
}
.section-footer .button {
  width: 100%;
  margin: 5px;
}

.ingredient-checkbox {
  display: flex;
  justify-content: left;
  margin: 5px;
}

.ingredient-cell {
  text-align: left;
}

</style>
