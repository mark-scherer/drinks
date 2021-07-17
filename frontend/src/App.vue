<template>
  <div>
    <div class="title">
      <h1>Let's find new drinks</h1>
    </div>
    <div class="drinks-input">
      <div class="must-include-selector">
        <h1 class="select-label">Ingredients you want</h1>
        <Autocomplete v-model="must_include_ingredients" 
          :choices="ingredients" 
          :placeholder="'Optional! Each drink will include all of these'"
        />
      </div>
      <div class="preferred-ingredients-selector">
        <h1 class="select-label">Ingredients you have</h1>
        <Autocomplete v-model="preferred_ingredients" 
          :choices="ingredients"
          :placeholder="preferredIngredientsPlaceholder"
        />
        <div class="preferred-only-switch">
          <h2 class="switch-label">Use only these ingredients?</h2>
          <Switch v-model="only_preferred_ingredients"/>
        </div>
      </div>
      <div class="get-drinks">
          <button
            @click = 'updateDrinks'
          >Get drinks</button>
      </div>
    </div>
    <DrinkList :drinks="drinks" :totalDrinksCount="total_drinks_count" :loading="loading" :drinksLoaded="drinks_loaded"/>
  </div>
</template>

<script>
const qs = require('qs')
const _ = require('lodash')
import { desanitize, sanitize } from './utils'

import DrinkList from './components/DrinkList.vue'
import Autocomplete from './components/Autocomplete.vue'
import Switch from './components/Switch.vue'

const SERVER_URL = 'http://localhost:8000'

const getIngredients = async function() {
  const url = new URL(`${SERVER_URL}/ingredients`)
  return fetch(url)
    .then(response => { 
      if (response.status !== 200) {
        console.error(`getIngredients got non-200 response: ${response.status}`)
      }
      return response.json()
        .then(parsed_response => {
          
          // add desanitized ingredient fields
          const individual_ingredients = _.map(parsed_response.ingredients, ingredient_info => {
            return {
              ...ingredient_info,
              name: desanitize(ingredient_info.ingredient),
              category: desanitize(ingredient_info.category)
            }
          })

          // expand ingredient families & format as autocomplete choices
          const families = _.map(parsed_response.families, (regex, parent) => {
            return {
              children: _.sortBy(_.filter(individual_ingredients, ingredient_info => RegExp(regex).test(ingredient_info.ingredient)), child => desanitize(child.name)),
              name: desanitize(parent),
              category: 'group'
            }
          })

          return [ ...individual_ingredients, ...families ]
        })
    })
    .catch(err => console.error(`error in getIngredients request: ${err}`))
}

export default {
  name: 'App',
  components: {
    DrinkList,
    Autocomplete,
    Switch
  },
  data() {
    return {
      drinks: [],
      total_drinks_count: 0,
      ingredients: [],
      must_include_ingredients: [],
      preferred_ingredients: [],
      only_preferred_ingredients: false,
      loading: false,
      drinks_loaded: false
    }
  },
  computed: {
    preferredIngredientsPlaceholder() {
      return this.only_preferred_ingredients ?
        'Optional! All ingredients will come from this list' :
        'Optional! We\'ll give preference to drinks with ingredients from this list'
    }
  },
  methods: {
    updateDrinks() {
      // console.log(JSON.stringify({ must_include_ingredients: this.must_include_ingredients }))
      const url = new URL(`${SERVER_URL}/drinks`)
      const must_include_ingredients = _.map(this.must_include_ingredients, ingredient => {
        return ingredient.category === 'group' ?
          _.map(ingredient.children, child => sanitize(child.name)) :
          [ sanitize(ingredient.name) ]
      })
      const preferred_ingredients = _.map(this.preferred_ingredients, ingredient => {
        return ingredient.category === 'group' ?
          _.map(ingredient.children, child => sanitize(child.name)) :
          [ sanitize(ingredient.name) ]
      })
      const params = {
        n: 3,
        must_include_ingredients,
        preferred_ingredients,
        only_preferred_ingredients: this.only_preferred_ingredients,
        alcoholic_drinks: true
      }
      url.search = qs.stringify(params, { encode: false })

      fetch(url)
        .then(response => { 
          if (response.status !== 200) {
            console.error(`getDrinks got non-200 response: ${response.status}`)
          }
          response.json()
            .then(parsed_response => {
              this.drinks = parsed_response.drinks
              this.total_drinks_count = parsed_response.drink_count
              
              this.loading = false
              this.drinks_loaded = true
            })
        })
        .catch(err => console.error(`error in getDrinks request: ${err}`))
      this.loading = true
    },
    updateIngredients() {
      getIngredients()
        .then(ingredients => {
          this.ingredients = ingredients
          console.log(JSON.stringify({ ingredients: this.ingredients }))
        })
        .catch(err => console.error(`error running updateIngredients: ${err}`))
    },
  },
  mounted() {
    this.updateIngredients()
  }
}

</script>

<style>
  #app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin: 60px auto 0px auto;
    max-width: 95%;
  }
  .drinks-input {
    margin-bottom: 20px;
  }
  .select-label {
    font-size: 1.25em;
    text-align: start;
  }
  .preferred-only-switch {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .switch-label {
    font-size: 1em;
    display: inline-block;
  }
  .get-drinks {
    margin-top: 10px;
  }
  button {
    font: inherit;
    font-size: 1.25em;
    padding: 10px 40px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    background: #f0f0f0;
    outline: none;
  }
  button:hover {
    background: #cfcfcf;
  }
  .hide {
    display: none !important;
  }

  /* styling of specific drink categories */
  .dropdown-choice.group .suggestion-category {
    font-weight: bolder;
    
  }

  .icon {
    height: 1.75em;
  }
  .icon-big {
    height: 4em;
  }
</style>
