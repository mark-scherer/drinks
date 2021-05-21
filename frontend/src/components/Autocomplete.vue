<!-- Autocomplete: custom auto-complete selector -->
<!-- modelValue is two-way bound to caller's input to v-model -->
  <!-- 'modelValue' name forced by vue 3: https://v3.vuejs.org/guide/forms.html#basic-usage -->

<template>
  <div class="autocomplete" >
    <div class='input-wrapper'>
      <div v-for="(selection, index) in modelValue" :key="selection" class="selected-choice">
        <div class="selected-choice-details">
          <span>{{selection}}</span>
          <img class="icon selection-x" src="https://img.icons8.com/ios/50/000000/multiply.png"
            @click="clickChoiceX(index)"
          />
        </div>
      </div>
      <input id="input" class="form-control" type="text" v-model="currentTyping" :placeholder="placeholder"
        @keydown.enter = 'enter'
        @keydown.delete = 'popModelValue'
        @keydown.down = 'down'
        @keydown.up = 'up'
        @input = 'change'
      />
      <img class="icon input-x" src="https://img.icons8.com/ios/50/000000/multiply.png" :class="{hide: !showClearInput}"
        @click="clickInputX(index)"
      />
    </div>
    <div class="dropdown-choice-list">
      <table :class="{hide: !showChoices}">
        <tbody>
          <tr v-for="(suggestion, index) in matches" :key="suggestion" class="dropdown-choice" :class="{ 'active-choice': isActive(index)}"
            @click="clickSuggestion(index)"
          >
            <td class="suggestion-category">
              {{ suggestion.category }}:
            </td>
            <td class="suggestion-name">
              <a href='#'>
                <b>
                  <span>{{ suggestion.name.substring(0, suggestion.typingStartIndex) }}</span>
                  <span class="highlighted-text">{{ suggestion.name.substring(suggestion.typingStartIndex, suggestion.typingEndIndex) }}</span>
                  <span>{{ suggestion.name.substring(suggestion.typingEndIndex, suggestion.name.length) }}</span>
                </b>
              </a>
            </td>
            <td class="suggestion-description">
              {{ suggestion.description }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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
      type: Array,
      required: true,
    },
    placeholder: {
      type: String,
      default: 'default'
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      open: false,
      currentIndex: 0,
      currentTyping: ''
    }
  },
  computed: {
    matches() {
      let matches = []
      _.forEach(this.choices, choice => {
        const typingStartIndex = choice.name.indexOf(this.currentTyping)
        if (typingStartIndex > -1 && !this.modelValue.includes(choice.name)) {
          const typingEndIndex = typingStartIndex + this.currentTyping.length
          const matchScore = (typingEndIndex - typingStartIndex) / choice.name.length
          matches.push({
            name: choice.name,
            category: choice.category,
            description: choice.description,
            typingStartIndex,
            typingEndIndex,
            matchScore 
          })
        }
      })
      const result = _.sortBy(matches, matches => -1*matches.matchScore).slice(0, this.maxMatches)
      this.clampCurrentIndex(result.length)
      return result
    },
    showChoices() {
      return this.currentTyping !== "" && this.matches.length > 0 && this.open === true
    },
    showClearInput() {
      return this.currentTyping !== "" || this.modelValue.length > 0
    }
  },
  methods: {
    enter() {
      if (this.showChoices) {
        this.$emit('update:modelValue', this.modelValue.concat([this.matches[this.currentIndex].name]))
        this.currentTyping = ''
      }
    },
    popModelValue() {
      const copy = _.cloneDeep(this.modelValue)
      copy.pop()
      if (this.currentTyping === '') this.$emit('update:modelValue', copy)
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
      this.$emit('update:modelValue', this.modelValue.concat([this.matches[index].name]))
      this.focusInput()
    },
    clickChoiceX(index) {
      const copy = _.cloneDeep(this.modelValue)
      copy.splice(index, 1)
      this.$emit('update:modelValue', copy)
    },
    clickInputX() {
      this.$emit('update:modelValue', [])
      this.currentTyping = ''
      this.focusInput()
    },
    focusInput() {
      document.getElementById('input').focus()
    },
    clampCurrentIndex(matchesLength) {
      this.currentIndex = _.clamp(this.currentIndex, matchesLength - 1)
    }
  }
}
</script>

<style scoped>
  .autocomplete {
    position: relative;
  }
  ul {
    width: 100%;
    padding-left: 0px;
    list-style: none;
  }
  .dropdown-choice-list {
    max-width: 1000px;
    margin: 10px auto 0px auto;
    overflow: hidden;
  }
  .suggestion-category {
    white-space: nowrap;
    font-size: small;
  }
  .suggestion-name {
    white-space: nowrap;
    padding: 0 10px;
  }
  .suggestion-description {
    white-space: nowrap;
    text-align: start;
    font-size: small;
  }
  .selected-choice{
    margin: 2px;
    background: #d3d3d3;
    padding: 0px 4px 0px 10px;
    border-radius: 10px;
    white-space: nowrap;
  }
  .selected-choice-details {
    display: flex;
    align-items: center;
  }
  .icon {
    height: 1.75em;
  }
  .selection-x {
    margin-left: 5px;
  }
  .input-x {
    float: right
  }
  .highlighted-text {
    background: #fcf9c2;
  }
  .active-choice {
    background: #f0f0f0;
    border-radius: 5px;
    padding: 0 10px;
    margin: 0 -10px;
  }
  a {
    text-decoration: none;
    color: inherit;
  }
  .input-wrapper {
    border: 1px solid gray;
    border-radius: 10px;
    display: flex;
    flex-wrap: wrap;
    padding: 5px;
    min-height: 2em;
    align-items: center;
  }
  input {
    border: none;
    outline: none;
    flex-grow: 1;
  }
</style>
