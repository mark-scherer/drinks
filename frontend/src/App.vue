<template>
  <div>
    <div class="drinks-input">
      <div class="must-include-selector">
        <h1 class="select-label">Ingredients you want</h1>
        <Autocomplete v-model="must_include_ingredients" :choices="ingredients"/>
      </div>
      <div class="preferred-ingredients-selector">
        <h1 class="select-label">Ingredients you have</h1>
        <Autocomplete v-model="preferred_ingredients" :choices="ingredients"/>
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
    <DrinkList :drinks="drinks" :totalDrinksCount="total_drinks_count" :drinksLoaded="drinks_loaded"/>
  </div>
</template>

<script>
const qs = require('qs')
const _ = require('lodash')
import { desanitize } from './utils'

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
          return _.map(parsed_response, ingredient_info => {
            return {
              ...ingredient_info,
              name: desanitize(ingredient_info.ingredient),
              category: desanitize(ingredient_info.category)
            }
          })
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
      drinks_loaded: false
    }
  },
  methods: {
    updateDrinks() {
      // console.log(JSON.stringify({ must_include_ingredients: this.must_include_ingredients }))
      const url = new URL(`${SERVER_URL}/drinks`)
      const params = {
        n: 3,
        must_include_ingredients: _.map(this.must_include_ingredients, ingredient => [ ingredient ]),
        preferred_ingredients: _.map(this.preferred_ingredients, ingredient => [ ingredient ]),
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
              this.drinks_loaded = true
            })
        })
        .catch(err => console.error(`error in getDrinks request: ${err}`))
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
    display: none;
  }
</style>
