<template>
  <div class="page">

    <!-- navbar -->
      <!-- inside page so logo and page contents aligned -->
    <div class="navbar">
      <div class="logo heading-font">SpinTheShaker</div>
    </div>

    <div class="content">
      
      <Questionnaire 
        :class="{hidden: pageState !== 'questions'}"
        v-model:prevQuestions="prevQuestions"
        :serverUrl="SERVER_URL"
        @done="questionsDone"
        @reopened="questionsReopened"
      />

      <!-- collapsed controls sections -->
      <div class="section controls" :class="{hidden: pageState === 'questions'}">
        <div 
          class="button naked-button restart-button"
          @click="restart()"
        >Start Over</div>
        <div 
          v-if="this.allAvailableIngredients.length || this.allUnavailableIngredients.length"
          class="button naked-button reset-button"
          @click="resetIngredientAvailability()"
        >{{resetIngredientsMessage}}</div>
      </div>

      <!-- drinks loading section -->
      <div class="section loading-placeholder" :class="{hidden: !loadingDrinks}">
        <img class="icon icon-big loading-spinner" src="./assets/spinner_logo.png"/>
        loading drinks ...
      </div>

      <IngredientChecker
        :class="{hidden: pageState !== 'ingredients' || loadingDrinks}"
        :ingredientsToCheck="uncheckedIngredients"
        :knownAvailableIngredients="allAvailableIngredients.length"
        :knownUnavailableIngredients="allUnavailableIngredients.length"
        @checked="ingredientsDone"
      />

      <DrinkList 
        :drinks="drinks"
        :loading="false"
        v-if="pageState === 'drinks'"
      />
    </div>
  </div>
</template>

<script>
const qs = require('qs')
const _ = require('lodash')
// const utils = require('./incl/utils')
// const config = require('./incl/config')

import Questionnaire from './components/Questionnaire.vue'
import IngredientChecker from './components/IngredientChecker.vue'
import DrinkList from './components/DrinkList.vue'

// for dev, need to specify the port... dev server doesn't use express
const SERVER_URL = process.env.NODE_ENV === 'development' ? `http://${window.location.hostname}:8000`: `http://${window.location.hostname}`

// fetches ingredients from api
// const fetchIngredients = function() {
//   const url = new URL(`${SERVER_URL}/ingredients`)
//   return fetch(url)
//     .then(response => { 
//       if (response.status !== 200) {
//         console.error(`fetchIngredients got non-200 response: ${response.status}`)
//       }
//       return response.json()
//         .then(parsed_response => {
          
//           // add desanitized ingredient fields
//           const individual_ingredients = _.map(parsed_response.ingredients, ingredient_info => {
//             return {
//               ...ingredient_info,
//               name: utils.desanitize(ingredient_info.ingredient),
//               category: utils.desanitize(ingredient_info.category)
//             }
//           })

//           // expand ingredient families & format as autocomplete choices
//           const families = _.map(parsed_response.families, (regex, parent) => {
//             return {
//               children: _.sortBy(_.filter(individual_ingredients, ingredient_info => RegExp(regex).test(ingredient_info.ingredient)), child => utils.desanitize(child.name)),
//               name: utils.desanitize(parent),
//               category: 'group'
//             }
//           })

//           return [ ...individual_ingredients, ...families ]
//         })
//     })
//     .catch(err => console.error(`error in fetchIngredients request: ${err}`))
// }

// const fetchDrinkRecs = function(n, _must_include_ingredients, _preferred_ingredients, only_preferred_ingredients, excluded_drinks, current_drinks) {
//   const url = new URL(`${SERVER_URL}/drinks/recs`)
//   const must_include_ingredients = _.map(_must_include_ingredients, ingredient => {
//     return ingredient.category === 'group' ?
//       _.map(ingredient.children, child => utils.sanitize(child.name)) :
//       [ utils.sanitize(ingredient.name) ]
//   })
//   const preferred_ingredients = _.map(_preferred_ingredients, ingredient => {
//     return ingredient.category === 'group' ?
//       _.map(ingredient.children, child => utils.sanitize(child.name)) :
//       [ utils.sanitize(ingredient.name) ]
//   })
//   const params = {
//     n,
//     must_include_ingredients,
//     preferred_ingredients,
//     only_preferred_ingredients,
//     alcoholic_drinks: true,
//     excluded_drinks,
//     current_drinks
//   }
//   url.search = qs.stringify(params, { encode: false })

//   return fetch(url)
//     .then(response => {
//       if (response.status !== 200) {
//         console.error(`getDrinks got non-200 response: ${response.status}`)
//       }
//       return response.json()
//     })
// }

// fetch wrapper
const _fetch = function(urlString, options={} ) {
  const url = new URL(urlString)
  url.search = qs.stringify(options.queryParams || {}, { encode: false })

  return fetch(url, options)
    .then(response => {
      if (response.status !== 200) {
        console.error(`_fetch got non-200 response: ${response.status}`)
      }
      return response.json()
    })
}

const fetchDrinksInfo = function(drinks) {
  const options = {
    method: 'POST',
    body: JSON.stringify({ drinks })
  }
  return _fetch(`${SERVER_URL}/drinks/info`, options)
}

const fetchDrinks = function(prevQuestions, availableIngredientNames, unavailableIngredientNames) {
  const options = {
    method: 'POST',
    body: JSON.stringify({ prevQuestions, availableIngredientNames, unavailableIngredientNames})
  }
  return _fetch(`${SERVER_URL}/drinks/drinks`, options)
}

export default {
  name: 'App',
  components: {
    Questionnaire,
    IngredientChecker,
    DrinkList,
  },
  data() {
    return {
      /* user inputs */
      prevQuestions: [],
      allAvailableIngredients: [],
      allUnavailableIngredients: [],

      /* current results state */
      drinks: [],
      excluded_drinks: [],

      /* page lifecycle state */
      expandedQuestionnaire: true,
      loadingDrinks: false,
      pageState: 'questions', // can be 'questions', 'ingredients' or 'drinks'

      /* constants */
      SERVER_URL: SERVER_URL
    }
  },
  computed: {
    uncheckedIngredients() {
      return _.chain(this.drinks)
        .map(drink => drink.recipe)
        .flatten()
        .map(ingredient => ingredient.ingredient)
        .filter(ingredientName => !this.allAvailableIngredients.includes(ingredientName) && !this.allUnavailableIngredients.includes(ingredientName))
        .sortBy()
        .uniq()
        .value()
    },

    resetIngredientsMessage() {
      return `Reset ${this.allAvailableIngredients.length} available and ${this.allUnavailableIngredients.length} unavailable ingredients`
    }
  },
  methods: {
    // replaceDrink(index) {
    //   console.log(`replacing drink: ${index}`)
    //   const removed_drink = this.drinks.splice(index, 1)[0]
    //   this.excluded_drinks.push(removed_drink.drink)

    //   this.loading = true
    //   fetchDrinkRecs(1, this.must_include_ingredients, this.preferred_ingredients, this.only_preferred_ingredients, this.excluded_drinks, _.map(this.drinks, 'drink'))
    //     .then(drinks_response => {
    //       this.total_drinks_count = this.drinks.length + drinks_response.drink_count
    //       this.drinks = this.drinks.concat(drinks_response.drinks)

    //       this.loading = false
    //       this.show_count_msg = true

    //       this.updateQueryString()
    //     })
    // },

    // get info for drinks included in url querystring
    getUrlDrinksInfo() {
      const params = new URLSearchParams(window.location.search)
      const urlDrinks = params.get('drinks')
      if (urlDrinks && urlDrinks.length > 0) {
        this.loadingDrinks = true
        fetchDrinksInfo(urlDrinks)
          .then(drinks_info => {
            this.drinks = drinks_info

            this.loadingDrinks = false
            this.show_count_msg = false
          })
      }
    },

    // update url querystring with new drinks
    updateQueryString() {
      if (history.pushState) {
        const url = new URL(window.location)
        url.searchParams.delete('drinks')
        url.searchParams.set('drinks', _.map(this.drinks, 'drink'))
        window.history.pushState({path: url.toString()}, '', url.toString())
        console.log(`updateQueryString: used pushHistory with ${url.toString()}`)
      } else console.error(`updateQueryString: cannot access history.pushState`)
    },

    /* page state transitions */
    questionsDone() {
      this.loadDrinks()
    },
    questionsReopened() {
      this.pageState = 'questions'
      this.prevQuestions = []
    },
    ingredientsDone({ _availableIngredients, _unavailableIngredients }) {

      this.allAvailableIngredients.push(..._availableIngredients)
      this.allUnavailableIngredients.push(..._unavailableIngredients)

      if (_unavailableIngredients.length === 0) {
        this.pageState = 'drinks'
      } else {
        this.loadDrinks()
      }
    },

    /* helper functions */
    loadDrinks() {
      this.pageState = 'ingredients'
      this.loadingDrinks = true
      fetchDrinks(this.prevQuestions, this.allAvailableIngredients, this.allUnavailableIngredients)
        .then(response => {
          this.drinks = response.drinks
          this.loadingDrinks = false
          if (this.uncheckedIngredients.length === 0) this.pageState = 'drinks'
        })
    },
    restart() {
      this.prevQuestions = []
      this.drinks = []
      this.pageState = 'questions'
    },
    resetIngredientAvailability() {
      this.allAvailableIngredients = []
      this.allUnavailableIngredients = []
      this.loadDrinks()
    }
  },
  mounted() {
    this.getUrlDrinksInfo()
  }
}

</script>

<style lang="scss">
  @import 'incl/_variables.scss';
  @import url('https://fonts.googleapis.com/css?family=Open+Sans');

  /* formatting */
  html, body, #app, .page {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  $page-padding: 15px;
  .page {
    margin: 0 auto;
    padding: $page-padding;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
  }
  $navbar-height: 60px;
  $navbar-padding-bottom: 10px;
  $navbar-margin-bottom: 0px;
  .navbar {
    height: $navbar-height;
    padding-bottom: $navbar-padding-bottom;
    margin-bottom: $navbar-margin-bottom;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .content {
    height: calc(100% - (#{$navbar-height} + #{$navbar-padding-bottom} + #{$navbar-margin-bottom} + 2*#{$page-padding}));
    overflow: hidden;
    display: flex;
    flex-direction: column;

    > div {
      overflow: scroll;

      &.hidden {
        display: none;
      }
    }
  }
  $section-border: 1px solid black;
  .section {
    border: $section-border;
    margin-bottom: 20px;
    padding: 20px;
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

  /* controls section */
  .controls {
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .controls .button {
    width: 100%;
  }
  .restart-button {
    flex-shrink: 2;
  }

  /* input section */

  /* input button styling */
  .button {
    cursor: pointer;
    background: lightgray;
    border: 1px solid black;
    margin: 5px;
    padding: 5px 15px;
    -webkit-transition: all .2s;
      transition: all .2s;

    &:hover {
      background: darkgray;
    }
    &.selected {
      background: darkgray;
      border: 2px solid black;
    }
    &.disabled, &.disabled:hover {
      background: gainsboro;
      color: gray;
      cursor: unset;
      border: none;
    }
  }
  .naked-button {
    border: none;
  }


  /* checkbox styling */
  [type="checkbox"] {
    position: absolute;
    left: 0;
    opacity: 0.01;
  }
  [type="checkbox"] ~ label {
    position: relative;
    padding-left: 2.3em;
    font-size: 1.05em;
    line-height: 1.7;
    cursor: pointer;
  }
  [type="checkbox"] ~ label:before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 1.4em;
    height: 1.4em;
    border: 1px solid #aaa;
    background: #FFF;
    border-radius: .2em;
    box-shadow: inset 0 1px 3px rgba(0,0,0, .1), 0 0 0 rgba(203, 34, 237, .2);
  }
  [type="checkbox"] ~ label:after {
    content: '✕';
    position: absolute;
    top: .525em;
    left: .18em;
    font-size: 1.375em;
    color: #d40000;
    line-height: 0;
  }

  // checking animation styling
  [type="checkbox"] ~ label:after {
    -webkit-transition: all .2s;
      transition: all .2s;
  }
  [type="checkbox"]:not(:checked) ~ label:after {
    opacity: 0;
    -webkit-transform: scale(0);
      transform: scale(0);
  }
  [type="checkbox"]:checked ~ label:after {
    opacity: 1;
    -webkit-transform: scale(1);
      transform: scale(1);
  }

  .bullet-point {
    height: 4px;
    width: 4px;
    background: black;
    margin-right: 10px;
  }

  /* ingredient category styling */
  // .base-spirit {
  //   background: $color-base-spirit !important;
  // }
  // .other-spirit {
  //   background: $color-other-spirit !important;
  // }
  // .wine-beer {
  //   background: $color-wine-beer !important;
  // }
  // .liqueur-cordial {
  //   background: $color-liqueur-cordial !important;
  // }
  // .mixer {
  //   background: $color-mixer !important;
  // }
  // .fruit-juice {
  //   background: $color-fruit-juice !important;
  // }
  // .flavoring-syrup {
  //   background: $color-flavoring-syrup !important;
  // }
  // .herb-spice {
  //   background: $color-herb-spice !important;
  // }
  // .garnish {
  //   background: $color-garnish !important;
  // }
  // .other-unknown {
  //   background: $color-other-unknown !important;
  // }
  // .group {
  //   background: $color-group !important;
  // }

  /* misc other app-wide styling */
  #app {
    font-family: "Open sans";
    text-align: center;
    color: $color-dark-primary;
  }
  .heading-font {
    font-family: "Playfair Display";
  }
  .logo {
    color: $color-dark-primary;
    font-size: xx-large;
    font-weight: 600;
  }

  .loading-placeholder {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    transition: height 0.25s ease;

    img {
      margin: 10px;
    }
  }
  .loading-spinner {
    animation-duration: 5s;
    animation-name: spinloader;
    animation-iteration-count: infinite;
  }
  @keyframes spinloader {
    0% {
      transform: rotate(0deg);
    }
    15% {
      transform: rotate(360deg);
    }
    25% {
      transform: translate(0%, 0%);
    }
    28% {
      transform: translate(6%, -18%);
    }
    31% {
      transform: translate(-6%, 18%);
    }
    34% {
      transform: translate(0%, 0%);
    }
  }

  .mod {
    color: red;
  }
  .hide {
    display: none !important;
  }
</style>
