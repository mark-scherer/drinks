<!-- Autocomplete: custom auto-complete selector -->
<!-- modelValue is value passed up to IngredientSelector.ingredient_selection, and is changed when IngredientSelector.ingredient_selection changes -->
  <!-- 'modelValue' name forced by vue 3: https://v3.vuejs.org/guide/forms.html#basic-usage -->

<template>
  <div class="autocomplete" >
    <ul class="selected-list">
      <li v-for="(selection, index) in modelValue" :key="selection" class="selected-choice">
        <div class="selected-choice-details">
          <span>{{selection}}</span>
          <img class="icon" src="https://img.icons8.com/ios/50/000000/multiply.png"
            @click="clickChoiceX(index)"
          />
        </div>
      </li>
    </ul>
    <input class="form-control" type="text" v-model="currentTyping" 
      @keydown.enter = 'enter'
      @keydown.down = 'down'
      @keydown.up = 'up'
      @input = 'change'
    />
    <ul class="dropdown-choice-list" :class="{open: openChoices}">
      <li v-for="(suggestion, index) in matches" :key="suggestion" class="dropdown-choice" :class="{ 'active-choice': isActive(index)}"
        @click="clickSuggestion(index)"
      >
        <a href='#'>{{ suggestion }}</a>
      </li>
    </ul>
  </div>
</template>

<script>
const _ = require('lodash')
// import x from 'vue-icon/lib/vue-feather.esm'


export default {
  name: 'Autocomplete',
  props: {
    choices: {
      type: Array,
      required: true
    },
    maxMatches: {
      type: Number,
      default: 10
    },
    modelValue: {
      type: Array,
      required: true,
    }
  },
  emits: ['update:modelValue'],
  components: {
    // x
  },
  data() {
    return {
      open: false,
      currentIndex: 0,
      currentTyping: ''
    }
  },
  computed: {
    matches() {
      return _.filter(this.choices, choice => choice.includes(this.currentTyping) && !this.modelValue.includes(choice)).slice(0, this.maxMatches)
    },
    openChoices() {
      return this.currentTyping !== "" && this.matches.length > 0 && this.open === true
    }
  },
  methods: {
    enter() {
      if (this.openChoices) this.$emit('update:modelValue', this.modelValue.concat([this.matches[this.currentIndex]]))
    },
    up() {
      if (this.currentIndex > 0) this.currentIndex--
    },
    down() {
      if (this.currentIndex < this.matches.length - 1) this.currentIndex++
    },
    isActive(index) {
      return index === this.currentIndex
    },
    change() {
      if (this.open === false) {
        this.open = true
        this.currentIndex = 0
      }
    },
    clickSuggestion(index) {
      this.$emit('update:modelValue', this.modelValue.concat([this.matches[index]]))
    },
    clickChoiceX(index) {
      const copy = _.cloneDeep(this.modelValue)
      copy.splice(index, 1)
      this.$emit('update:modelValue', copy)
    }
  }
}
</script>

<style scoped>
  .autocomplete {
    position: relative;
    min-height: 200px;
  }
  ul {
    width: 100%;
    padding-left: 0px;
    list-style: none;
  }
  .dropdown-choice-list:not(.open) {
    display: none;
  }
  .selected-choice{
    display: inline-block;
    margin: 4px 10px;
    background: lightgray;
    padding: 5px 5px 5px 10px;
    border-radius: 15px;
    white-space: nowrap;
  }
  .selected-choice-details {
    display: flex;
    align-items: center;
  }
  .icon {
    height: 2em;
    margin-left: 5px;
  }
  .active-choice {
    background: gray;
    border-radius: 10px;
  }
  a {
    text-decoration: none;
    color: inherit;
  }
</style>
