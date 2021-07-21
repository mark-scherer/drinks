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
      <div class='drink-buttons'>
        <div class="get-drinks">
          <button
            @click = 'updateAllDrinks'
          >{{updateDrinksButton}}</button>
        </div>
         <div class="share-drinks" v-if="drinks_loaded">
          <button
            @click = 'copyDrinksLink'
          >
            <div>{{shareDrinksButton}}</div>
            <img class="icon icon-small" src="https://img.icons8.com/material-sharp/50/000000/copy.png"/>
          </button>
        </div>
      </div>
    </div>
    <DrinkList :drinks="drinks" :totalDrinksCount="total_drinks_count" :loading="loading" :drinksLoaded="drinks_loaded" :excluded_drinks="excluded_drinks"
      @replaceDrink="replaceDrink"
    />
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
const DRINK_COUNT = 3

// fetches ingredients from api
const fetchIngredients = function() {
  const url = new URL(`${SERVER_URL}/ingredients`)
  return fetch(url)
    .then(response => { 
      if (response.status !== 200) {
        console.error(`fetchIngredients got non-200 response: ${response.status}`)
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
    .catch(err => console.error(`error in fetchIngredients request: ${err}`))
}

const fetchDrinks = function(n, _must_include_ingredients, _preferred_ingredients, only_preferred_ingredients, excluded_drinks, current_drinks) {
  const url = new URL(`${SERVER_URL}/drinks`)
  const must_include_ingredients = _.map(_must_include_ingredients, ingredient => {
    return ingredient.category === 'group' ?
      _.map(ingredient.children, child => sanitize(child.name)) :
      [ sanitize(ingredient.name) ]
  })
  const preferred_ingredients = _.map(_preferred_ingredients, ingredient => {
    return ingredient.category === 'group' ?
      _.map(ingredient.children, child => sanitize(child.name)) :
      [ sanitize(ingredient.name) ]
  })
  const params = {
    n,
    must_include_ingredients,
    preferred_ingredients,
    only_preferred_ingredients,
    alcoholic_drinks: true,
    excluded_drinks,
    current_drinks
  }
  url.search = qs.stringify(params, { encode: false })

  return fetch(url)
    .then(response => {
      if (response.status !== 200) {
        console.error(`getDrinks got non-200 response: ${response.status}`)
      }
      return response.json()
    })
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
      /* user inputs state */
      must_include_ingredients: [],
      preferred_ingredients: [],
      only_preferred_ingredients: false,

      /* current results state */
      ingredients: [],
      drinks: [],
      total_drinks_count: 0,
      excluded_drinks: [],

      /* page lifecycle state */
      loading: false,
      drinks_loaded: false,
      link_copied: false
    }
  },
  computed: {
    preferredIngredientsPlaceholder() {
      return this.only_preferred_ingredients ?
        'Optional! All ingredients will come from this list' :
        'Optional! We\'ll give preference to drinks with ingredients from this list'
    },
    updateDrinksButton() {
      return this.drinks_loaded ?
        'Get new drinks' :
        'Get drinks'
    },
    shareDrinksButton() {
      return this.link_copied ?
        'Copied!' :
        'Get link to drinks'
        
    }
  },
  methods: {
    updateIngredients() {
      fetchIngredients()
        .then(ingredients => {
          this.ingredients = ingredients
          console.log(JSON.stringify({ ingredients: this.ingredients }))
        })
        .catch(err => console.error(`error running updateIngredients: ${err}`))
    },
    updateAllDrinks() {
      this.excluded_drinks = []
      this.drinks = []
      this.loading = true
      fetchDrinks(DRINK_COUNT, this.must_include_ingredients, this.preferred_ingredients, this.only_preferred_ingredients, this.excluded_drinks)
        .then(drinks_response => {
          this.drinks = drinks_response.drinks
          this.total_drinks_count = drinks_response.drink_count

          this.loading = false
          this.drinks_loaded = true
          this.link_copied = false
        })
    },
    replaceDrink(index) {
      console.log(`replacing drink: ${index}`)
      const removed_drink = this.drinks.splice(index, 1)[0]
      this.excluded_drinks.push(removed_drink.drink)

      this.loading = true
      fetchDrinks(1, this.must_include_ingredients, this.preferred_ingredients, this.only_preferred_ingredients, this.excluded_drinks, _.map(this.drinks, 'drink'))
        .then(drinks_response => {
          this.total_drinks_count = this.drinks.length + drinks_response.drink_count
          this.drinks = this.drinks.concat(drinks_response.drinks)

          this.loading = false
          this.drinks_loaded = true
          this.link_copied = false
        })
    },
    getDrinksLink() {
      const url = new URL(window.location)
      const params = new URLSearchParams()
      params.set('drinks', _.map(this.drinks, 'drink'))
      return `${url.toString()}?${params.toString()}`
    },
    copyDrinksLink() {
      const url = this.getDrinksLink()
      console.log(`copying ${url}`)

      const tmp = document.createElement('textarea')
      tmp.innerText = url
      document.getElementById('app').appendChild(tmp)
      tmp.select()
      document.execCommand('copy')
      tmp.remove()

      this.link_copied = true
    }

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
  .icon {
    height: 1.75em;
    cursor: pointer;
  }
  .icon-small {
    height: 1.25em;
  }
  .icon-big {
    height: 4em;
  }
  .hide {
    display: none !important;
  }

  /* input section */
  .drinks-input {
    margin-bottom: 20px;
  }

  /* input fields */
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

  /* styling of specific drink categories */
  .dropdown-choice.group .suggestion-category {
    font-weight: bolder;
  }

  /* input buttons */
  .drink-buttons {
    display: flex;
    justify-content: center;
    margin-top: 10px;
  }
  .drink-buttons * {
    margin: 0 10px;
  }
  .share-drinks button {
    display: flex;
    padding-right: 10px;
  }
  button {
    font: inherit;
    font-size: 1.25em;
    padding: 10px 40px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    background: #d1cfcf;
    outline: none;
  }
  button:hover {
    background: #a3a3a3;
  }
</style>
