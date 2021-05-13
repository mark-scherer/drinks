<template>
  <div>
    <IngredientSelector v-bind:ingredients="ingredients"/>
    <DrinkList v-bind:drinks="drinks"/>
  </div>
</template>

<script>
const qs = require('qs')

import DrinkList from './components/DrinkList.vue'
import IngredientSelector from './components/IngredientSelector.vue'

const SERVER_URL = 'http://localhost:8000'

const getDrinks = async function() {
  // construct dummy request
  const url = new URL(`${SERVER_URL}/drinks`)
  const params = {
    n: 3,
    must_include_ingredients: [
      [
        'canadian_whisky',
        'tennessee_whiskey',
        'blended_whiskey',
        'bourbon',
        'irish_whiskey',
        'whisky',
        'whiskey',
        'rye_whiskey'
      ]
    ],
    alcoholic_drinks: true
  }
  url.search = qs.stringify(params, { encode: false })

  return fetch(url)
    .then(response => { 
      if (response.status !== 200) {
        console.error(`getDrinks got non-200 response: ${response.status}`)
      }
      return response.json()
    })
    .catch(err => console.error(`error in getDrinks request: ${err}`))
}

const getIngredients = async function() {
  const url = new URL(`${SERVER_URL}/ingredients`)
  return fetch(url)
    .then(response => { 
      if (response.status !== 200) {
        console.error(`getIngredients got non-200 response: ${response.status}`)
      }
      return response.json()
    })
    .catch(err => console.error(`error in getIngredients request: ${err}`))
}

export default {
  name: 'App',
  components: {
    DrinkList,
    IngredientSelector
  },
  data() {
    return {
      drinks: [],
      ingredients: []
    }
  },
  methods: {
    updateDrinks() {
      getDrinks()
        .then(drinks => {
          this.drinks = drinks
        })
        .catch(err => console.error(`error running updateDrinks: ${err}`))
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
    this.updateDrinks()
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
  margin-top: 60px;
}
</style>
