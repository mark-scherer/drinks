<!-- Autocomplete: custom auto-complete selector -->

<template>
  <div class="autocomplete" >
    <!-- {{choices}} -->
    <input class="form-control" type="text" :value="modelValue" 
      @keydown.enter = 'enter'
      @keydown.down = 'down'
      @keydown.up = 'up'
      @input = 'change'
    />
    <ul class="dropdown-choices" :class="{open: openChoices}">
      <li v-for="(suggestion, index) in matches" :key="suggestion" :class="{ active: isActive(index)}"
        @click="suggestionClick(index)"
      >
        <span>{{ suggestion }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
const _ = require('lodash')

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
      type: String,
      required: true,
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      open: false,
      current: 0,
    }
  },
  computed: {
    matches() {
      return _.filter(this.choices, choice =>  choice.includes(this.modelValue)).slice(0, this.maxMatches)
    },
    openChoices() {
      return this.modelValue !== "" && this.matches.length > 0 && this.open === true
    }
  },
  methods: {
    enter() {
      this.$emit('update:modelValue', this.matches[this.current])
      this.open = false
    },
    up() {
      if (this.current > 0) this.current--
    },
    down() {
      if (this.current < this.matches.length - 1) this.current++
    },
    isActive(index) {
      return index === this.current
    },
    change() {
      this.$emit('update:modelValue', event.target.value)
      if (this.open === false) {
        this.open = true
        this.current = 0
      }
    },
    suggestionClick(index) {
      this.$emit('update:modelValue', this.matches[index])
      this.open = false
    },
  }
}
</script>

<style scoped>
  .autocomplete {
    position: relative;
    min-height: 200px;
  }
  .dropdown-choices {
    width: 100%;
    padding-left: 0px;
    list-style: none;
  }
  .dropdown-choices:not(.open) {
    display: none;
  }
  .active {
    background: gray;
    border-radius: 10px;
  }
</style>
