<!-- IngredientCard: selectable ingredient card for various input components 
  ingredientData interface:
    - category: unchecked ingredient category, 'group' treated specially
    - name: desanitized ingredient name
    - children: list of ingredient children, same requirements as upper-level ingredients (only required if category === 'group')
-->

<template>
    <div class="ingredient-card" :class="cardStyling" @click="handleClick()">
    
      <!-- single selected element card -->
      <div class="card-header" :class="{'card-header-compact': compact}">
        <img v-if="ingredientData.category ==='group'" :src="expanded ? 'https://img.icons8.com/ios-glyphs/50/000000/collapse-arrow.png' : 'https://img.icons8.com/ios-glyphs/50/000000/expand-arrow.png'"
          class="icon group-card-icon"
          @click="() => expanded = !expanded"
        />
        
        <span>{{ingredientData.category ==='group' ? `${ingredientData.name} (${ingredientData.children.length})` : ingredientData.name}}</span>
        
        <img v-if="removeable" class="icon card-x-icon" src="https://img.icons8.com/ios/50/000000/multiply.png"
          @click="removeSelf()"
        />
      </div>

      <!-- expanded card: children of a group -->
      <div :class="['card-body', expanded ? '' : 'hide']">
        <IngredientCard v-for="child in ingredientData.children" :key="child.name"
          :ingredientData="child"
          :removeable="false"
        />
      </div>
    
    </div>
 
</template>

<script>
const _ = require('lodash')
const utils = require('../incl/utils')

export default {
  name: 'IngredientCard',
  emits: ['clicked', 'removed'],
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
    }
  },
  data() {
    return {
      expanded: false
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
    handleClick() {
      console.log(`clicked: ${this.ingredientData.name}`)
      this.$emit('clicked')
    },
    removeSelf() {
      this.$emit('remove')
    },
    // sanitizeClass(input) {
    //   return utils.sanitizeClass(input)
    // }
  }
}
</script>

<style scoped>
.ingredient-card {
  margin: 2px;
  background: #d3d3d3;
  border-radius: 10px;
  white-space: nowrap;
  max-width: 49%;
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
  padding: 0
}

.card-body {
  background: #ffffff;
  margin: 5px;
  border-radius: 5px;
  display: flex;
  flex-wrap: wrap;
}
.ingredient-child {
  margin: 5px;
  padding: 2px 5px;
}

/* card icons */
.group-card-icon {
  margin: 0 5px 0 0;
}
.card-x-icon {
  margin-left: 5px;
  padding: 2px;
}
</style>
