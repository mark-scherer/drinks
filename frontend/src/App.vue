<template>
  <div>

    <div class="page">

      <!-- navbar -->
        <!-- inside page so logo and page contents aligned -->
      <div class="navbar">
        <div class="logo heading-font">SpinTheShaker</div>
      </div>

      <Questionnaire 
        v-model:chosenDrinkNames="chosenDrinkNames"
        v-model:unchosenDrinkNames="unchosenDrinkNames" 
        :serverUrl="SERVER_URL"
        @done="getDrinks"
      />

      <DrinkList 
        :drinks="drinks"
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
    Questionnaire,
    DrinkList,
  },
  data() {
    return {
      /* user inputs */
      chosenDrinkNames: [],
      unchosenDrinkNames: [],

      /* current results state */
      drinks: [],
      excluded_drinks: [],

      /* page lifecycle state */
      loading: false,
      drinks_loaded: false,

      /* constants */
      SERVER_URL: SERVER_URL
    }
  },
  computed: {},
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
    //       this.drinks_loaded = true
    //       this.show_count_msg = true

    //       this.updateQueryString()
    //     })
    // },

    // get info for drinks included in url querystring
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

    // get new drinks according to user inputs
    getDrinks() {
      console.log(`App: fetching drinks!`)
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

  /* app-wide formatting */
  .page {
    margin: 0 auto;
    max-width: 50%;
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

  /* input button styling */
  .button {
    cursor: pointer;
    background: lightgray;
    margin: 5px 0;
    padding: 5px;
  }
  .naked-button {
    background: none;
  }
  .button:hover {
    background: gray;
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
