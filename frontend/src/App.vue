<template>
  <div>

    <div class="page">

    <!-- navbar -->
      <!-- inside page so logo and page contents aligned -->
    <div class="navbar">
      <div class="logo heading-font">SpinTheShaker</div>
    </div>

      <!-- input section -->
      <div class="drinks-input">

        <CollapsableInput v-model:selection="must_include_ingredients" v-model:expanded="expandedSelector.mustIncludeIngredients"
          @update:expanded="handleCollaspables('mustIncludeIngredients', $event)"
          :choices="ingredients" 
          :preselects="preselects"
          :expandedLabel="'Pick ingredients you want'" 
          :sublabel="'Every drink will include ALL of these'"
          :collapsedLabel="'OR pick ingredients you want'"
          :placeholder="'Type to see more ingredients...'"
          :inputId="'must-include-input'"
        />

        <CollapsableInput v-model:selection="preferred_ingredients" v-model:expanded="expandedSelector.preferredIngredients"
          @update:expanded="handleCollaspables('preferredIngredients', $event)"
          :choices="ingredients" 
          :expandedLabel="'Pick ingredients you have'" 
          :sublabel="'Every drink will use JUST these ingredients'"
          :collapsedLabel="'OR pick ingredients you have'"
          :placeholder="'Try \'whiskey\' or \'egg whites\''"
          :inputId="'preferred-input'"
        />
        
        <div class="drink-buttons">
          <div class="get-drinks">
            <button @click = 'updateAllDrinks'>{{updateDrinksButton}}</button>
          </div>
        </div>
      </div>

      <!-- list of drinks  -->
      <DrinkList 
        :drinks="drinks" 
        :totalDrinksCount="total_drinks_count" 
        :loading="loading" 
        :drinksLoaded="drinks_loaded" 
        :showCountMsg="show_count_msg" 
        :excluded_drinks="excluded_drinks"
        @replaceDrink="replaceDrink"
      />

    </div>
  </div>
</template>

<script>
const qs = require('qs')
const _ = require('lodash')
const utils = require('./incl/utils')
const config = require('./incl/config')

import DrinkList from './components/DrinkList.vue'
import CollapsableInput from './components/CollapsableInput.vue'

// for dev, need to specify the port... dev server doesn't use express
const SERVER_URL = process.env.NODE_ENV === 'development' ? `http://${window.location.hostname}:8000`: `http://${window.location.hostname}`

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
              name: utils.desanitize(ingredient_info.ingredient),
              category: utils.desanitize(ingredient_info.category)
            }
          })

          // expand ingredient families & format as autocomplete choices
          const families = _.map(parsed_response.families, (regex, parent) => {
            return {
              children: _.sortBy(_.filter(individual_ingredients, ingredient_info => RegExp(regex).test(ingredient_info.ingredient)), child => utils.desanitize(child.name)),
              name: utils.desanitize(parent),
              category: 'group'
            }
          })

          return [ ...individual_ingredients, ...families ]
        })
    })
    .catch(err => console.error(`error in fetchIngredients request: ${err}`))
}

const fetchDrinkRecs = function(n, _must_include_ingredients, _preferred_ingredients, only_preferred_ingredients, excluded_drinks, current_drinks) {
  const url = new URL(`${SERVER_URL}/drinks/recs`)
  const must_include_ingredients = _.map(_must_include_ingredients, ingredient => {
    return ingredient.category === 'group' ?
      _.map(ingredient.children, child => utils.sanitize(child.name)) :
      [ utils.sanitize(ingredient.name) ]
  })
  const preferred_ingredients = _.map(_preferred_ingredients, ingredient => {
    return ingredient.category === 'group' ?
      _.map(ingredient.children, child => utils.sanitize(child.name)) :
      [ utils.sanitize(ingredient.name) ]
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

const fetchDrinksInfo = function(drinks) {
  const url = new URL(`${SERVER_URL}/drinks/info`)
  const params = { drinks }
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
    CollapsableInput,
    // Autocomplete,
    // Switch
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
      expandedSelector: {
        mustIncludeIngredients: true,
        preferredIngredients: false
      },
      loading: false,
      drinks_loaded: false,
      show_count_msg: true
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
    preselects() {
      return _.shuffle(this.ingredients).slice(0, _.random(config.MIN_PRESELECTS, config.MAX_PRESELECTS))
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
      fetchDrinkRecs(null, this.must_include_ingredients, this.preferred_ingredients, this.only_preferred_ingredients, this.excluded_drinks)
        .then(drinks_response => {
          this.drinks = drinks_response.drinks
          this.total_drinks_count = drinks_response.drink_count

          this.loading = false
          this.drinks_loaded = true
          this.show_count_msg = true

          this.updateQueryString()
        })
    },
    replaceDrink(index) {
      console.log(`replacing drink: ${index}`)
      const removed_drink = this.drinks.splice(index, 1)[0]
      this.excluded_drinks.push(removed_drink.drink)

      this.loading = true
      fetchDrinkRecs(1, this.must_include_ingredients, this.preferred_ingredients, this.only_preferred_ingredients, this.excluded_drinks, _.map(this.drinks, 'drink'))
        .then(drinks_response => {
          this.total_drinks_count = this.drinks.length + drinks_response.drink_count
          this.drinks = this.drinks.concat(drinks_response.drinks)

          this.loading = false
          this.drinks_loaded = true
          this.show_count_msg = true

          this.updateQueryString()
        })
    },
    getUrlDrinksInfo() {
      const params = new URLSearchParams(window.location.search)
      const urlDrinks = params.get('drinks')
      if (urlDrinks && urlDrinks.length > 0) {
        this.loading = true
        fetchDrinksInfo(urlDrinks)
          .then(drinks_info => {
            this.drinks = drinks_info

            this.loading = false
            this.drinks_loaded = true
            this.show_count_msg = false
          })
      }
    },
    updateQueryString() {
      if (history.pushState) {
        const url = new URL(window.location)
        url.searchParams.delete('drinks')
        url.searchParams.set('drinks', _.map(this.drinks, 'drink'))
        window.history.pushState({path: url.toString()}, '', url.toString())
        console.log(`updateQueryString: used pushHistory with ${url.toString()}`)
      } else console.error(`updateQueryString: cannot access history.pushState`)
    },
    handleCollaspables(selector, nowExpanded) {
      const otherSelector = selector === 'mustIncludeIngredients' ? 'preferredIngredients' : 'mustIncludeIngredients'
      if (!nowExpanded) this.expandedSelector[otherSelector] = true // collapsing, open other selector
      else this.expandedSelector[otherSelector] = false // expanding, close other selector
    }
  },
  mounted() {
    this.updateIngredients(),
    this.getUrlDrinksInfo()
  }
}

</script>

<style lang="scss">
  @import 'incl/_variables.scss';
  @import url('https://fonts.googleapis.com/css?family=Open+Sans');

  /* app-wide formatting */
  .page {
    margin: 0 auto;
    max-width: 95%;
  }

  /* icon styling */
  .icon {
    height: 1.75em;
    cursor: pointer;
  }
  .icon-big {
    height: 4em;
  }
  .icon-small {
    height: 1.25em;
  }
  .icon-x-small {
    height: 1em;
  }

  /* navbar */
  .navbar {
    height: 60px;
    padding: 40px 0 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .logo {
    color: $color-dark-primary;
    font-size: xx-large;
    font-weight: 600;
  }

  /* input section */
  .drinks-input {
    margin-bottom: 20px;
  }

  /* input button styling */
  .drink-buttons {
    display: flex;
    justify-content: center;
    margin-top: 10px;
  }
  .drink-buttons * {
    margin: 0 10px;
  }
  button {
    font: inherit;
    font-size: 1.25em;
    padding: 10px 40px;
    border: none;
    cursor: pointer;
    background: #d1cfcf;
    outline: none;
  }
  button:hover {
    background: #a3a3a3;
  }

  /* ingredient category styling */
  .base-spirit {
    background: $color-base-spirit !important;
  }
  .other-spirit {
    background: $color-other-spirit !important;
  }
  .wine-beer {
    background: $color-wine-beer !important;
  }
  .liqueur-cordial {
    background: $color-liqueur-cordial !important;
  }
  .mixer {
    background: $color-mixer !important;
  }
  .fruit-juice {
    background: $color-fruit-juice !important;
  }
  .flavoring-syrup {
    background: $color-flavoring-syrup !important;
  }
  .herb-spice {
    background: $color-herb-spice !important;
  }
  .garnish {
    background: $color-garnish !important;
  }
  .other-unknown {
    background: $color-other-unknown !important;
  }
  .group {
    background: $color-group !important;
  }

  /* misc other app-wide styling */
  #app {
    font-family: "Open sans";
    text-align: center;
    color: $color-dark-primary;
  }
  .heading-font {
    font-family: "Playfair Display";
  }
  .mod {
    color: red;
  }
  .hide {
    display: none !important;
  }
</style>
