<!-- Questionnaire: question machine to guide drink selection -->

<template>
  <div class="section">

    <div class="heading heading-font">Let's find new drinks you'll love</div>

    <div class="question-block" v-if="!loadingQuestion">
      <div class="subheading">
        <div>{{formatQuestion()}}</div>
        <div class="question-counter-container">{{formattedCount}}</div>
      </div>
      <div 
        v-for="(choice, index) in choices" :key="choice.drink" 
        class="choice button" :class="{selected: selectedIndex === index}"
        v-on:click="pickedChoice(index)"
      >
        <div>{{formatChoice(choice)}}</div>
      </div>
      <div class="footer">
        <div 
          class="button naked-button" :class="{selected: selectedIndex === -1}"
          v-on:click="pickedChoice(-1)"
        >None of these</div>
        <div 
          class="button submit-button" :class="{disabled: selectedIndex === null}"
          v-on:click="clickedSubmit()"
        >submit</div>
      </div>
    </div>

    <div class="loading-placeholder question-block-placeholder" v-if="loadingQuestion">
      <img class="icon icon-big loading-spinner" src="../assets/spinner_logo.png"/>
      <div>loading next question...</div>
    </div>

  </div>
</template>

<script>
import { desanitize } from '../incl/utils'
const _ = require('lodash')
// const utils = require('../incl/utils')

const QUESTION_ENDPOINT = 'drinks/question'
const TOTAL_QUESTIONS = 3

const RECEIPE_QUESTIONS = [
  'Which of these pairings sound best?',
  'Which of these would you prefer?',
  'Pick your favorite',
  'What\'s your preference?',
  'Any of these look interesting?'

]
const INGREDIENT_PRECEDENCE = [
  'base_spirit',
  'other_spirit',
  'wine_/_beer',
  'mixer',
  'fruit_/_juice',
  'liqueur_/_cordial',
  'other_/_unknown',
  'flavoring_/_syrup',
  'herb_/_spice',
  'garnish'
]

export default {
  name: 'Questionnaire',
  props: {

    /* outputs */
    chosenDrinks: {
      type: Array,
      required: true,
      description: 'two-way bound list of full drink objects selected by the user in question rounds'
    },
    unchosenDrinks: {
      type: Array,
      required: true,
      description: 'two-way bound list of full drink objects not selected by the user in question rounds'
    },

    /* misc settings */
    serverUrl:{
      type: String,
      required: true,
      description: 'base url of server'
    }
  },
  emits: ['update:chosenDrinks', 'update:unchosenDrinks', 'done'],
  data() {
    return {
      /* class vars */
      choices: [],
      selectedIndex: null,
      questionCount: 0,

      /* UI state vars */
      loadingQuestion: false,

      /* constants */
      TOTAL_QUESTIONS: TOTAL_QUESTIONS
    }
  },
  computed: {
    formattedCount: function() {
      return `${this.questionCount} / ${TOTAL_QUESTIONS}`
    }
  },
  methods: {
    pickedChoice(index) {
      this.selectedIndex = index
    },
    clickedSubmit() {
      if (this.selectedIndex === null || this.selectedIndex === undefined) throw Error(`Questionaire.clickedSubmit(): clicked submit without assigning this.selectedIndex`)
      
      const _choices = _.cloneDeep(this.choices)

      // updating two-way bound vars takes time, don't want to wait so we pass updated values directly into this.getNextQuestion()
      let _chosenDrinks, _unchosenDrinks

      // if no index, picked 'none of the above'
      if (this.selectedIndex !== -1) {
        _chosenDrinks = this.chosenDrinks.concat([ this.choices[this.selectedIndex] ])
        this.$emit('update:chosenDrinks', _chosenDrinks)
        _choices.splice(this.selectedIndex, 1)
      }
      
      _unchosenDrinks = this.unchosenDrinks.concat(_choices)
      this.$emit('update:unchosenDrinks', _unchosenDrinks)
      
      this.selectedIndex = null
      if (this.questionCount < TOTAL_QUESTIONS) this.getNextQuestion(_chosenDrinks, _unchosenDrinks)
      else this.$emit('done')
    },

    // get next question from server
      // _chosenDrinks, _unchosenDrinks allows caller to override use of this.chosenDrinks, this.unchosenDrinks to prevent having to wait for them to update asynchornously
    async getNextQuestion(_chosenDrinks, _unchosenDrinks) {
      this.loadingQuestion = true

      const body = JSON.stringify({
        chosenDrinks: _chosenDrinks || this.chosenDrinks,
        unchosenDrinks: _unchosenDrinks || this.unchosenDrinks
      })

      let fullQuestionResponse, questionResponse
      try {
        questionResponse = await fetch(new URL(QUESTION_ENDPOINT, this.serverUrl), {
          method: 'POST', 
          body
        }).then(rawResponse => {
            fullQuestionResponse = rawResponse
            return rawResponse.json()
          })
      } catch (getQuestionError) {
        console.error(`Error: getNextQuestion: error getting question from server: ${JSON.stringify({ 
          chosenDrinks: this.chosenDrinks, 
          unchosenDrinks: this.unchosenDrinks,
          getQuestionError: String(getQuestionError)
        })}`)
        return
      }

      if (fullQuestionResponse.status !== 200) {
        console.error(`Error: getNextQuestion: error in server response: ${JSON.stringify({ 
          chosenDrinks: this.chosenDrinks, 
          unchosenDrinks: this.unchosenDrinks,
          questionResponse
        })}`)
        return
      }

      console.log(`getNextQuestion: got new questions: ${JSON.stringify({ 
        chosenDrinks: this.chosenDrinks, 
        unchosenDrinks: this.unchosenDrinks,
        questionResponse
      })}`)

      this.choices = questionResponse.choices
      this.questionCount += 1
      this.loadingQuestion = false
    },

    formatQuestion() {
      return _.shuffle(RECEIPE_QUESTIONS)[0]
    },
    formatChoice(choice) {
      return _.chain(choice.displayRecipe)
        .sortBy(ingredientInfo => {
          const category = ingredientInfo.ingredient_info.category
          const precedence = INGREDIENT_PRECEDENCE.indexOf(category)
          if (precedence < 0) throw Error(`Questionnire.formatChoice: did not know how to sort ingredient: ${JSON.stringify({ category })}`)
          return precedence
        })
        .map(ingredientInfo => desanitize(ingredientInfo.ingredient))
        .value()
        .join(', ')
    }
  },
  mounted() {
    this.getNextQuestion()
  }
}
</script>

<style scoped lang="scss">

.heading {
  font-size: larger;
  font-weight: 600;
  margin-bottom: 15px;
  text-align: left;
}
.subheading {
  font-size: medium;
  margin-bottom: 10px;
  position: relative;
}
.question-counter-container {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;

  div {
    padding-left: 5px;
    background: white;
  }
}
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}
.submit-button {
  padding: 5px 40px;
}

.question-block-placeholder {
  height: 195px;
}

</style>
