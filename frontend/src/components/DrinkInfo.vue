<!-- DrinkInfo: basic overview of single drink -->
  <!-- expanded: two-way bound var controlling if DrinkInfo is collapsed or expanded -->

<template>
  <div class="drink-info">
      <div class="drink-banner">
        <h1 class="heading-font">{{desanitize(drink_info.drink, {capitalize: true})}}</h1>
        <img class="icon icon-small" src="https://img.icons8.com/ios/50/000000/data-in-both-directions.png"
          @click="replaceDrink"
        />
      </div>

      <!-- drink-summary when drink collapsed -->
      <div class="drink-summary" :class="{hide: expanded}">
        <div class = "ingredients-summary">
          <p
            v-html="ingredients_summary(sortIngredients(drink_info.ingredient_info))"
          ></p>
        </div>
        <div class="drink-metadata-summary">
          <div v-if="drink_info.category"><span><b>Category:</b> {{desanitize(drink_info.category)}}</span></div>
          <div v-if="drink_info.glass"><span><b>Glass:</b> {{desanitize(drink_info.glass)}}</span></div>
        </div>
      </div>

      <!-- drink-detail when drink expanded --> 
      <div class="drink-details" :class="{hide: !expanded}">
        <div class="drink-metadata-details">
          <div v-if="drink_info.category"><span><b>Category:</b> {{desanitize(drink_info.category)}}</span></div>
          <div v-if="drink_info.glass"><span><b>Glass:</b> {{desanitize(drink_info.glass)}}</span></div>
        </div>

        <div class="drink-comments">
          {{drink_info.comments}}
        </div>

        <div class="drink-instructions">
          {{drink_info.instructions}}
        </div>

        <div class="ingredient-details">
          <ul>
            <li v-for="ingredient_info in sortIngredients(drink_info.recipe)" :key="ingredient_info.ingredient" class="ingredient-instructions" 
              v-html="ingredient_detail(ingredient_info)"
            ></li>
          </ul>
        </div>

      </div>
      
      <img :src="expanded ? 'https://img.icons8.com/ios-glyphs/50/000000/collapse-arrow.png' : 'https://img.icons8.com/ios-glyphs/50/000000/expand-arrow.png'"
        class="icon group-icon"
        @click="toggle"
      />
  </div>
</template>

<script>
const _ = require('lodash')
const utils = require('../incl/utils')

export default {
  name: 'DrinkInfo',
  props: {
    drink_info: Object,
    expanded: {
      type: Boolean,
      required: true,
    }
  },
  emits: ['update:expanded', 'replaceDrink'],
  methods: {
    desanitize: utils.desanitize,
    toggle() {
      console.log(`toggling DrinkInfo (${this.drink_info.drink}) to: ${!this.expanded}`)
      this.$emit('update:expanded', !this.expanded)
    },
    sortIngredients(ingredient_info) {
      return _.sortBy(ingredient_info, info => {
        if (info.quantity === 'fill') return 1
        return 0
      })
    },
    ingredients_summary(ingredient_info) {
      return _.map(ingredient_info, info => {
        const premods_html = _.map(info.premods, mod => `<span class="mod">${this.desanitize(mod)}</span>`).join('<span> </span>')
        const postmods_html = _.map(info.postmods, mod => `<span class="mod">${this.desanitize(mod)}</span>`).join('<span> </span>')
        return `${premods_html} ${this.desanitize(info.ingredient)}${postmods_html ? ` ${postmods_html}`: ''}`
      }).join(', ')
    },
    ingredient_detail(ingredient_info) {
      let quantity_str
      if (ingredient_info.quantity === 'fill') quantity_str = 'fill with'
      else quantity_str = `${ingredient_info.quantity} ${ingredient_info.units || ''}`

      const premods_html = _.map(ingredient_info.premods, mod => `<span class="mod">${this.desanitize(mod)}</span>`).join('<span> </span>')
      const postmods_html = _.map(ingredient_info.postmods, mod => `<span class="mod">${this.desanitize(mod)}</span>`).join('<span> </span>')

      return `${quantity_str} ${premods_html} ${this.desanitize(ingredient_info.ingredient)} ${postmods_html}`
    },
    replaceDrink() {
      this.$emit('replaceDrink')
    }
  },
}
</script>

<style scoped>
  p {
    display: inline
  }
  span {
    font-size: medium;
  }
  .drink-info {
    margin: 15px 0;
  }

  /* top banner */
  .drink-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h1 {
    text-align: left;
    margin-bottom: 10px;
    font-weight: 500;
  }

  /* when collapsed */
  .drink-summary {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .ingredients-summary {
    width: 60%;
    text-align: left;
  }
  .drink-metadata-summary {
    width: 35%;
    text-align: left;
  }

  /* when expanded */
  .drink-details * {
    text-align: start;
    margin: 10px 0;
  }
  .drink-metadata-details {
    display: flex;
  }
  .drink-metadata-details div {
    margin-right: 25px;
  }
  .drink-comments {
    text-align: start;
  }
  .ingredient-instructions {
    margin: 0;
  }
</style>
