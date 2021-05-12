<template>
  <DrinkList v-bind:drinks="drinks" ref="drink_list"/>
</template>

<script>
import DrinkList from './components/DrinkList.vue'
const qs = require('qs')

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
  // issue encoding & decoding nested list in querystring
    // probably want to assess how both encoding & decoding work & format in general
  // url.search = new URLSearchParams(params).toString()
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

export default {
  name: 'App',
  components: {
    DrinkList
  },
  data() {
    return {
      drinks: []
    }
  },
  methods: {
    updateDrinks() {
      getDrinks()
        .then(drinks => {
          this.drinks = drinks
        })
        .catch(err => console.error(`error running updateDrinks: ${err}`))
    }
  },
  mounted() {
    this.updateDrinks()
  }
}

// send dummy request at startup
// updateDrinks()

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
