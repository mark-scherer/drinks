<!-- Autocomplete: custom auto-complete selector -->
<!-- modelValue is two-way bound to caller's input to v-model -->
  <!-- 'modelValue' name forced by vue 3: https://v3.vuejs.org/guide/forms.html#basic-usage -->

<!-- 
  TO DO: 
    - update display of selected-choice cards for groups
    - update modelValue output when groups selected
-->

<template>
  <div class="autocomplete" >

    <div class='input-wrapper'>
      
      <div v-for="(selection, index) in modelValue" :key="selection.name" :class="['selected-choice', selection.category_class, selection.expanded ? 'expanded' : '']">
        <div class="selected-choice-details">
          <img v-if="selection.category ==='group'" :src="selection.expanded ? 'https://img.icons8.com/ios-glyphs/50/000000/collapse-arrow.png' : 'https://img.icons8.com/ios-glyphs/50/000000/expand-arrow.png'"
            class="icon group-icon"
            @click="() => selection.expanded = !selection.expanded"
          />
          
          <span>{{selection.category ==='group' ? `${selection.name} (${selection.children.length})` : selection.name}}</span>
          
          <img class="icon selection-x-icon" src="https://img.icons8.com/ios/50/000000/multiply.png"
            @click="clickChoiceX(index)"
          />
        </div>

        <div :class="['selection-group-children', selection.expanded ? '' : 'hide']">
          <div v-for="(child) in selection.children" :key="child.name" :class="['selection-group-child', child.category_class]">
            {{child.name}}
          </div>
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
          <tr v-for="(suggestion, index) in matches" :key="suggestion" class="dropdown-choice" :class="[ isActive(index) ? 'active-choice': '', suggestion.category_class ]"
            @click="clickSuggestion(index)"
          >
            <td class="suggestion-category">
              {{ suggestion.category }}:
            </td>
            <td class="suggestion-name" :class="{  }">
              <a href='#'>
                <b>
                  <span>{{ suggestion.name.substring(0, suggestion.typingStartIndex) }}</span>
                  <span class="highlighted-text">{{ suggestion.name.substring(suggestion.typingStartIndex, suggestion.typingEndIndex) }}</span>
                  <span>{{ suggestion.name.substring(suggestion.typingEndIndex, suggestion.name.length) }}</span>
                </b>
              </a>
            </td>
            <td class="suggestion-description" v-html="suggestion.description"></td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script>
const _ = require('lodash')
import { sanitize } from './../utils'

const classFromCategory = (category) => {
  return sanitize(category).replace(/_/g, '-')
}

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
      // ranked desc
      const rankMatch = (choice, typingStartIndex, typingEndIndex) => {
        let score = (typingEndIndex - typingStartIndex) / choice.name.length
        
        if (choice.category === 'group') score += 1

        return score
      }

      let matches = []
      _.forEach(this.choices, choice => {
        // TO DO: also search description, including default description for groups
          // ex: 'bourbon' should produce 'whiskey' family as a choice
        const typingStartIndex = choice.name.indexOf(this.currentTyping)
        const allIncludedNames = _.flatten(_.map(this.modelValue, selection => {
          if (selection.category === 'group') return [selection.name, ..._.map(selection.children, 'name')]
          else return selection.name
        }))
        
        if (typingStartIndex > -1 && !allIncludedNames.includes(choice.name)) {
          const typingEndIndex = typingStartIndex + this.currentTyping.length
          const matchScore = rankMatch(choice, typingStartIndex, typingEndIndex)

          const category_class = classFromCategory(choice.category)
          if (choice.category === 'group') {
            choice.children = _.map(choice.children, child => {
              return {
                ...child,
                category_class: classFromCategory(child.category)
              }
            })
          }

          const description = !choice.description && choice.category === 'group' ? 
            `<b>includes ${choice.children.length} choices:</b> ${_.map(choice.children, 'name').join(', ')}` : 
            choice.description

          matches.push({
            ...choice,
            category_class,
            description,
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
    
    // add this.matches[this.currentIndex] to modelValue after enter clicked
    enter() {
      if (this.showChoices) {
        this.$emit('update:modelValue', this.modelValue.concat([this.matches[this.currentIndex]]))
        this.currentTyping = ''
      }
    },

    // pop last value off modelValue after backspace typed
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

    // add this.matches[index] to modelValue after clicked
    clickSuggestion(index) {
      this.$emit('update:modelValue', this.modelValue.concat([this.matches[index]]))
      this.focusInput()
    },

    // remove element at index from modelValue after its X clicked
    clickChoiceX(index) {
      const copy = _.cloneDeep(this.modelValue)
      copy.splice(index, 1)
      this.$emit('update:modelValue', copy)
    },

    // clear modelValue after selection X clicked
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
    },
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
  .selected-choice {
    margin: 2px;
    background: #d3d3d3;
    border-radius: 10px;
    white-space: nowrap;
    max-width: 50%;
  }
  .selected-choice-details {
    display: flex;
    align-items: center;
    margin: 0 4px 0 10px;
    justify-content: space-between;
  }
  .icon {
    height: 1.75em;
  }
  .group-icon {
    margin: 0 5px 0 -5px;
  }
  .selection-x-icon {
    margin-left: 5px;
  }
  .input-x {
    float: right
  }
  .selection-group-children {
    background: #ffffff;
    margin: 5px;
    border-radius: 5px;
    display: flex;
    flex-wrap: wrap;
  }
  .selection-group-child {
    margin: 0 5px;
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
