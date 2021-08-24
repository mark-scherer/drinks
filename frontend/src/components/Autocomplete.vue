<!-- Autocomplete: custom auto-complete selector -->

<!-- 
  TO DO: 
    - update display of selected-choice cards for groups
-->

<template>
  <div class="autocomplete" >

    <!-- preselects -->
    <div class="preselects-container" v-if="preselectsData.length > 0">
      <div>Try:</div>
      <IngredientCard v-for="(ingredientData, index) in preselectsData" :key="ingredientData.name" class="preselect-card"
        :ingredientData="ingredientData"
        :selectable="true"
        :removeable="false"
        :descriptionOpen="preselectDescriptionsOpen[index]"
        @clicked="selectPreselect(index)"
        @update:descriptionOpen="handlePreselectDescriptionUpdate($event, index)"
      />
    </div>

    <!-- input box -->
    <div class='input-wrapper'>
      
      <!-- cards of selected choices -->
      <IngredientCard v-for="(selectedItem, index) in selection" :key="selectedItem.name"
        :ingredientData="selectedItem"
        :compact="true"
        :descriptionOpen="selectionDescriptionsOpen[index]"
        @remove="removeChoice(index)"
        @update:descriptionOpen="handleSelectionDescriptionUpdate($event, index)"
      />

      <!-- input element -->
      <input :id="inputId" class="form-control" type="text" v-model="currentTyping" :placeholder="placeholder"
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

    <!-- suggestion dropdown -->
    <div class="dropdown-choice-list">
      <table :class="{hide: !showChoices}">
        <tbody>
          <tr v-for="(suggestion, index) in matches" :key="suggestion" class="dropdown-choice" :class="[ isActive(index) ? 'active-choice': '']"
            @mouseover="setActiveSuggestion(index)"
            @click="clickSuggestion(index)"
          >
            <td class="suggestion-category" :class="sanitizeClass(suggestion.category)">
              {{ suggestion.category }}
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
const utils = require('../incl/utils')

import IngredientCard from './IngredientCard.vue'

export default {
  name: 'Autocomplete',
  components: {
    IngredientCard
  },
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
      default: '',
      description: 'input element placeholder'
    },
    preselectsData: {
      type: Array,
      default: () => [],
      description: 'nested list of choices to provide as selectable cards'
    },
    maxMatches: {
      type: Number,
      default: 10,
      description: 'max number of matches shown in dropdown at once'
    },
    inputId: {
      type: String,
      default: 'autocomplete-input',
      description: 'id for input component'
    }
  },
  emits: ['update:selection'],
  data() {
    return {
      open: false,
      currentIndex: 0,
      currentTyping: '',
      preselectDescriptionsOpen: [],
      selectionDescriptionsOpen: []
    }
  },
  watch: {
    preselectsData(val) {
      this.preselectDescriptionsOpen = Array(val.length).fill(false)
    },
    selection(val) {
      this.selectionDescriptionsOpen = Array(val.length).fill(false)
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

          const description = !choice.description && choice.category === 'group' ? 
            `<b>includes ${choice.children.length} choices:</b> ${_.map(choice.children, 'name').join(', ')}` : 
            choice.description

          matches.push({
            ...choice,
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
    selectPreselect(index) {
      const selectedPreselect = this.preselectsData[index]
      const currentChoices = _.map(this.selection, 'name')
      if (!currentChoices.includes(selectedPreselect.name)) {
        this.$emit('update:selection', this.selection.concat(this.preselectsData[index]))
      }
    },
    handlePreselectDescriptionUpdate(status, index) {
      console.log(`handlePreselectDescriptionUpdate: ${status}, ${index}`)
      if (status) {
        // close all other preselect descriptions
        _.forEach(_.range(this.preselectDescriptionsOpen.length), i => {
          if (i === index) this.preselectDescriptionsOpen[i] = true
          else this.preselectDescriptionsOpen[i] = false
        })

        // close all selection descriptions
        _.forEach(_.range(this.selectionDescriptionsOpen.length), i => {
          this.selectionDescriptionsOpen[i] = false
        })
      } else this.preselectDescriptionsOpen[index] = false
    },
    handleSelectionDescriptionUpdate(status, index) {
      if (status) {
        // close all other selection descriptions
        _.forEach(_.range(this.selectionDescriptionsOpen.length), i => {
          if (i === index) this.selectionDescriptionsOpen[i] = true
          else this.selectionDescriptionsOpen[i] = false
        })

        // close all preselect descriptions
        _.forEach(_.range(this.preselectDescriptionsOpen.length), i => {
          this.preselectDescriptionsOpen[i] = false
        })
      } else this.selectionDescriptionsOpen[index] = false
    },

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
    sanitizeClass(input) {
      return utils.sanitizeClass(input)
    }
  },
  mounted() {
    this.focusInput()
  }
}
</script>

<style scoped lang="scss">
  .autocomplete {
    position: relative;
  }

  /* preselects */
  .preselects-container {
    display: flex;
    align-items: center;
    margin-top: 15px;
    margin-bottom: 10px;
    font-size: larger;
    position: relative;
  }
  .preselect-card {
    margin: 0 25px 0 10px;
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
  .dropdown-choice.group .suggestion-category {
    font-weight: bolder;
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

  .input-x {
    float: right
  }

  .highlighted-text {
    background: rgb(#fcf9c2, 0.5);
  }
  .active-choice {
    background: #f0f0f0;
    padding: 0 10px;
    margin: 0 -10px;
  }
  a {
    text-decoration: none;
    color: inherit;
  }
  .input-wrapper {
    position: relative;
    border: 1px solid gray;
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
