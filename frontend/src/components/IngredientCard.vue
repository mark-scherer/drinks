<!-- IngredientCard: selectable ingredient card for various input components 
  ingredientData interface:
    - category: unchecked ingredient category, 'group' treated specially
    - name: desanitized ingredient name
    - description: ingredient description
    - children: list of ingredient children, same requirements as upper-level ingredients (only required if category === 'group')
-->

<template>
  <div class="ingredient-card-container">
    <!-- description content, usually hidden -->
    <div v-if="descriptionOpen" class="ingredient-card-description">
      <div>{{ingredientData.description}}</div>
      <img class="icon x-icon" src="https://img.icons8.com/ios/50/000000/multiply.png" @click="handleDescription(true)"/>
    </div>
    
    <div class="ingredient-card" :class="cardStyling" @click="handleClick()">
    
      <!-- single selected element card -->
      <div class="card-header" :class="{'card-header-compact': compact}">
        <!-- left aligned content -->
        <div class="card-header-content">
          <img v-if="ingredientData.category ==='group'" :src="expanded ? 'https://img.icons8.com/ios-glyphs/50/000000/collapse-arrow.png' : 'https://img.icons8.com/ios-glyphs/50/000000/expand-arrow.png'"
            class="icon icon-small group-card-icon"
            @click="() => expanded = !expanded"
          />
          
          <span>{{ingredientData.category ==='group' ? `${ingredientData.name} (${ingredientData.children.length})` : ingredientData.name}}</span>
        </div>
        
        <!-- right aligned content -->
        <div class="card-header-content">
          <img v-if="ingredientData.description" class="icon icon-small info-icon" src="https://img.icons8.com/ios/50/000000/help.png"
            @click.stop="handleDescription()"
          />
          <img v-if="removeable" class="icon x-icon" src="https://img.icons8.com/ios/50/000000/multiply.png"
            @click="removeSelf()"
          />
        </div>
      </div>

      <!-- expanded card: children of a group -->
      <div :class="['card-body', expanded ? '' : 'hide']">
        <IngredientCard v-for="child in ingredientData.children" :key="child.name"
          :ingredientData="child"
          :removeable="false"
        />
      </div>
    
    </div>
  </div>
 
</template>

<script>
const _ = require('lodash')
const utils = require('../incl/utils')

const MARGIN = '2px'

export default {
  name: 'IngredientCard',
  emits: ['clicked', 'removed', 'update:descriptionOpen'],
  props: {
    ingredientData: {
      type: Object,
      required: true,
      description: 'ingredient info, see comments for docs',
      validator: value => {
        const validateData = (data) => _.every(['category', 'name'], key => data[key] !== null & data[key] !== undefined)

        if (value.category === 'group') {
          if (!value.children || value.children.length === 0) return false
          if (!_.every(value.children, child => validateData(child))) return false
        }
        return validateData(value)
      }
    },
    selectable: {
      type: Boolean,
      default: false,
      description: 'control over whether entire card is selectable & emits clicked'
    },
    removeable: {
      type: Boolean,
      default: true,
      description: 'control over whether card presents X to clear itself'
    },
    compact: {
      type: Boolean,
      default: false,
      description: 'reduce size of card'
    },
    descriptionOpen: {
      type: Boolean,
      default: false,
      required: true,
      description: 'two-way bound control over if description popup is open'
    }
  },
  data() {
    return {
      expanded: false,
      margin: MARGIN
    }
  },
  computed: {
    cardStyling() {
      const styling = {
        'selectable-card': this.selectable,
      }
      styling[utils.sanitizeClass(this.ingredientData.category)] = true
      return styling
    }
  }, 
  methods: {
    // disabled because can't find a good way to format descriptions
    handleDescription(closed) {
      let newDesriptionOpened
      if (closed) newDesriptionOpened = false
      else newDesriptionOpened = !this.descriptionOpen
      this.$emit('update:descriptionOpen', newDesriptionOpened)
    },
    handleClick() {
      console.log(`clicked: ${this.ingredientData.name}`)
      this.$emit('clicked')
    },
    removeSelf() {
      this.$emit('remove')
    }
  },
  mounted() {
    console.log(this.margin)
  }
}
</script>

<style scoped>
/* .ingredient-card-container {
  max-width: 49%;
} */
.ingredient-card {
  margin: 2px;
  background: #d3d3d3;
  white-space: nowrap;
}
.selectable-card {
  cursor: pointer
}

.card-header {
  display: flex;
  align-items: center;
  margin: 0 5px;
  justify-content: space-between;
  padding: 2px 5px;
}
.card-header-compact {
  padding: 0 0 0 5px;
}
.card-header-content {
  display: flex;
  align-items: center;
}

.card-body {
  background: #ffffff;
  margin: 5px;
  display: flex;
  flex-wrap: wrap;
}
.ingredient-child {
  margin: 5px;
  padding: 2px 5px;
}

.ingredient-card-description {
  position: absolute;
  bottom: 100%;
  left: 7px; /* container padding plus element margin */
  max-height: 150px;
  overflow: scroll;
  text-align: left;
  background: lightgray;
  padding: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* card icons */
.group-card-icon {
  margin: 0 5px 0 0;
}
.info-icon {
  margin: 0 -4px 0 10px;
}
.x-icon {
  margin: 0 -4px 0 4px;
}
</style>
