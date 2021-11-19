<!-- DrinkList: collection of DrinkSummaries plus ingredient lists -->

<template>
  <div class="section drink-list-container">
    <div class="drink-list" :style="drinkListStyling">
      <div v-for="(drink, drinkIndex) in drinks" :key="drink.drink" class="drink-info" :style="drinkInfoStyling">
        <div class="drink-title">{{desanitize(drink.drink, {capitalize: true})}}</div>
        <div class="drink-content">
          <div class=drink-rating>
            <img v-for="(starSrc, starIndex) in drinkStarsMap[drinkIndex]" :key="starIndex" :src="starSrc">
          </div>
          <div class="drink-metadata">
            <div v-if="drink.category"><b>category:</b> {{desanitize(drink.category)}}</div>
            <div v-if="drink.glass"><b>glass:</b> {{desanitize(drink.glass)}}</div>
          </div>
          <div v-if="drinks.description">{{drink.description}}</div>
          <div v-if="drink.instructions">{{drink.instructions}}</div>
          <div class="drink-recipe-container">
            <div class="drink-recipe">
              <div v-for="ingredient in drink.recipe" :key="ingredient.ingredient" class="drink-ingredient">
                <div class="bullet-point"></div>
                <div>{{desanitize(ingredient.ingredient)}}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="currentIndex > 0" class="arrow" id="left-arrow" @click="updateIndex(false)">
      <img class="icon icon-small" src="https://img.icons8.com/ios-filled/50/000000/back.png"/>
    </div>
    <div v-if="currentIndex < drinks.length-1" class="arrow" id="right-arrow" @click="updateIndex(true)">
      <img class="icon icon-small" src="https://img.icons8.com/ios-filled/50/000000/forward--v1.png"/>
    </div>
  </div>
</template>

<script>
const utils = require('../incl/utils')
// import DrinkInfo from './DrinkInfo.vue'
const _ = require('lodash')

export default {
  name: 'DrinkList',
  props: {
    drinks: Array,
    loading: Boolean,
  },
  data() {
    return {
      currentIndex: 0
    }
  },
  computed: {
    drinkListStyling() {
      return {
        width: `${this.drinks.length * 100}%`,
        'margin-left': `-${this.currentIndex*100}%`
      }
    },
    drinkInfoStyling() {
      return {
        width: `${100/this.drinks.length}%`
      }
    },

    // map of star img source for all stars for all drinks
    drinkStarsMap() {
      return _.map(this.drinks, drink => {
        const drinkStars = parseFloat(_.round(drink.source_avg_rating)) / 2.0 // source_avg_rating out of 10, convert to out of 5 w/ halves
        return _.map(_.range(1, 6), i => {
          if (drinkStars > i) return require('../assets/full_star.svg')
          else if (drinkStars === i - 0.5) return require('../assets/half_star.svg')
          else return require('../assets/empty_star.svg')
        })
      })
    }
  },
  methods: {
    updateIndex(increment) {
      if (increment) this.currentIndex = Math.min(this.currentIndex + 1, this.drinks.length - 1)
      else this.currentIndex = Math.max(this.currentIndex - 1, 0)
    },

    desanitize(input, options) {
      return utils.desanitize(input, options)
    }
  }
}
</script>

<style scoped lang="scss">
$arrow-height: 20px;
$arrow-width: 20px;

.drink-list-container {
  position: relative;
  padding-left: 0;
  padding-right: 0;
}
.drink-list {
  width: 300%;
  display: flex;
  transition: margin 0.5s ease;
}
.drink-info {
  display: flex;
  flex-direction: column;
}
.drink-title {
  font-size: x-large;
  font-weight: 600;
  margin: 0 40px 15px 40px;
}
.drink-content {
  flex-grow: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: calc(2*#{$arrow-width});
  margin-right: calc(2*#{$arrow-width});

  & > div {
    margin-bottom: 10px;
  }
}
.drink-metadata {
  display: flex;
  justify-content: space-evenly;
}
.drink-recipe {
  width: fit-content;
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: start;
}
.drink-ingredient {
  display: flex;
  align-items: center;
}

.arrow {
  position: absolute;
  height: $arrow-height;
  top: calc(50% - #{$arrow-height}/2);
  margin: 0 10px;
}
#left-arrow {
  left: 0
}
#right-arrow {
  right: 0;
}
</style>
