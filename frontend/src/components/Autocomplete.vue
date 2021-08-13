<!-- Autocomplete: custom auto-complete selector -->

<!-- 
  TO DO: 
    - update display of selected-choice cards for groups
-->

<template>
  <div class="autocomplete" >

    <div class='input-wrapper'>
      
      <div v-for="(selectedItem, index) in selection" :key="selectedItem.name" :class="['selected-choice', selectedItem.category_class, selectedItem.expanded ? 'expanded' : '']">
        <div class="selected-choice-details">
          <img v-if="selectedItem.category ==='group'" :src="selectedItem.expanded ? 'https://img.icons8.com/ios-glyphs/50/000000/collapse-arrow.png' : 'https://img.icons8.com/ios-glyphs/50/000000/expand-arrow.png'"
            class="icon group-icon"
            @click="() => selectedItem.expanded = !selectedItem.expanded"
          />
          
          <span>{{selectedItem.category ==='group' ? `${selectedItem.name} (${selectedItem.children.length})` : selectedItem.name}}</span>
          
          <img class="icon selection-x-icon" src="https://img.icons8.com/ios/50/000000/multiply.png"
            @click="removeChoice(index)"
          />
        </div>

        <div :class="['selection-group-children', selectedItem.expanded ? '' : 'hide']">
          <div v-for="(child) in selectedItem.children" :key="child.name" :class="['selection-group-child', child.category_class]">
            {{child.name}}
          </div>
        </div>
      </div>

      <input :id="inputId || 'autocomplete-input'" class="form-control" type="text" v-model="currentTyping" :placeholder="placeholder"
        @keydown.enter = 'enterKey'
        @keydown.delete = 'popModelValue'
        @keydown.down = 'downArrow'
        @keydown.up = 'upArrow'
        @input = 'changedTyping'
      />
      <img class="icon input-x" src="https://img.icons8.com/ios/50/000000/multiply.png" :class="{hide: !showClearInput}"
        @click="clearChoices(index)"
      />

    </div>

    <div class="dropdown-choice-list">
      <table :class="{hide: !showChoices}">
        <tbody>
          <tr v-for="(suggestion, index) in matches" :key="suggestion" class="dropdown-choice" :class="[ isActive(index) ? 'active-choice': '', suggestion.category_class ]"
            @mouseover="setActiveSuggestion(index)"
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
      required: true,
      description: 'list of choices available for selection'
    },
    selection: {
      type: Array,
      required: true,
      description: 'tow-way bound list of selected items'
    },
    placeholder: {
      type: String,
      default: 'default',
      description: 'input element placeholder'
    },
    maxMatches: {
      type: Number,
      default: 10,
      description: 'max number of matches shown in dropdown at once'
    },
    inputId: {
      type: String,
      description: 'id for input component'
    }
  },
  emits: ['update:selection'],
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
      const choices_copy = _.cloneDeep(this.choices) // allows modifying this.choices without triggering endless recusion
      _.forEach(choices_copy, choice => {
        // TO DO: also search description, including default description for groups
          // ex: 'bourbon' should produce 'whiskey' family as a choice
        const typingStartIndex = choice.name.indexOf(this.currentTyping)
        const allIncludedNames = _.flatten(_.map(this.selection, selectedItem => {
          if (selectedItem.category === 'group') return [selectedItem.name, ..._.map(selectedItem.children, 'name')]
          else return selectedItem.name
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
      return this.currentTyping !== "" || this.selection.length > 0
    }
  },
  methods: {
    
    /* inputs handlers */

    // add this.matches[this.currentIndex] to selection after enter clicked
    enterKey() {
      if (this.showChoices) {
        this.$emit('update:selection', this.selection.concat([this.matches[this.currentIndex]]))
        this.currentTyping = ''
        this.clampCurrentIndex()
      }
    },

    // pop last value off selection after backspace typed
    popModelValue() {
      const copy = _.cloneDeep(this.selection)
      copy.pop()
      if (this.currentTyping === '') this.$emit('update:selection', copy)
    },

    upArrow() {
      if (this.currentIndex > 0) this.currentIndex--
    },
    downArrow() {
      if (this.currentIndex < this.matches.length - 1) this.currentIndex++
    },

    setActiveSuggestion(index) {
      console.log(`setActiveSuggestion! ${index}`)
      this.currentIndex = index
    },

    // add this.matches[index] to selection after clicked
    clickSuggestion(index) {
      this.$emit('update:selection', this.selection.concat([this.matches[index]]))
      this.currentTyping = ''
      this.clampCurrentIndex()
      this.focusInput()
    },

    // remove element at index from selection after its X clicked
    removeChoice(index) {
      const copy = _.cloneDeep(this.selection)
      copy.splice(index, 1)
      this.$emit('update:selection', copy)
      this.currentTyping = ''
    },

    // clear selection after selection X clicked
    clearChoices() {
      this.$emit('update:selection', [])
      this.currentTyping = ''
      this.focusInput()
    },

    changedTyping() {
      if (this.open === false) {
        this.open = true
        this.currentIndex = 0
      }
    },

    /* state methods */ 
    isActive(index) {
      return index === this.currentIndex
    },

    /* helper methods */
    focusInput() {
      document.getElementById(this.inputId).focus()
    },
    clampCurrentIndex(matchesLength) {
      this.currentIndex = _.clamp(this.currentIndex, 0, matchesLength - 1)
    },
  },
  mounted() {
    this.focusInput()
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
    cursor: pointer;
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
    max-width: 49%;
  }
  .selected-choice-details {
    display: flex;
    align-items: center;
    margin: 0 4px 0 10px;
    justify-content: space-between;
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
