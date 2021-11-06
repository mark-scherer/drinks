<!-- Questionnaire: question machine to guide drink selection -->

<template>
  <div class="section">

    <div class="heading heading-font">Let's find new drinks you'll love</div>

    <div class="question-block" v-if="!loadingQuestion">
      <div class="subheading">{{formatQuestion()}}</div>
      <div 
        v-for="(choice, index) in choices" :key="choice.drink" 
        class="choice button"
        v-on:click="pickedChoice(index)"
      >
        <div>{{formatChoice(choice)}}</div>
      </div>
      <div class="footer">
        <div 
          class="button naked-button"
          v-on:click="pickedChoice()"
        >None of these</div>
        <div>Question {{formattedCount}}</div>
      </div>
    </div>

    <div class="loading-placeholder question-block-placeholder" v-if="loadingQuestion">
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
    chosenDrinkNames: {
      type: Array,
      required: true,
      description: 'two-way bound list of drink names selected by the user in question rounds'
    },
    unchosenDrinkNames: {
      type: Array,
      required: true,
      description: 'two-way bound list of drink names not selected by the user in question rounds'
    },

    /* misc settings */
    serverUrl:{
      type: String,
      required: true,
      description: 'base url of server'
    }
  },
  emits: ['update:chosenDrinkNames', 'update:unchosenDrinkNames', 'done'],
  data() {
    return {
      /* class vars */
      choices: [],
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
      const _choices = _.cloneDeep(this.choices)

      // updating two-way bound vars takes time, don't want to wait so we pass updated values directly into this.getNextQuestion()
      let _chosenDrinkNames, _unchosenDrinkNames

      // if no index, picked 'none of the above'
      if (index !== null && index !== undefined) {
        _chosenDrinkNames = this.chosenDrinkNames.concat([ this.choices[index].drink ])
        this.$emit('update:chosenDrinkNames', _chosenDrinkNames)
        _choices.splice(index, 1)
      }
      
      _unchosenDrinkNames = this.unchosenDrinkNames.concat(_.map(_choices, 'drink'))
      this.$emit('update:unchosenDrinkNames', _unchosenDrinkNames)
      
      if (this.questionCount < TOTAL_QUESTIONS) this.getNextQuestion(_chosenDrinkNames, _unchosenDrinkNames)
      else this.$emit('done')
    },

    // get next question from server
      // _chosenDrinkNames, _unchosenDrinkNames allows caller to override use of this.chosenDrinkNames, this.unchosenDrinkNames to prevent having to wait for them to update asynchornously
    async getNextQuestion(_chosenDrinkNames, _unchosenDrinkNames) {
      this.loadingQuestion = true

      const url = new URL(QUESTION_ENDPOINT, this.serverUrl)
      url.searchParams.set('chosenDrinkNames', _chosenDrinkNames || this.chosenDrinkNames)
      url.searchParams.set('unchosenDrinkNames', _unchosenDrinkNames || this.unchosenDrinkNames)

      let fullQuestionResponse, questionResponse
      try {
        questionResponse = await fetch(url, {method: 'GET'})
          .then(rawResponse => {
            fullQuestionResponse = rawResponse
            return rawResponse.json()
          })
      } catch (getQuestionError) {
        console.error(`Error: getNextQuestion: error getting question from server: ${JSON.stringify({ 
          chosenDrinkNames: this.chosenDrinkNames, 
          unchosenDrinkNames: this.unchosenDrinkNames,
          getQuestionError: String(getQuestionError)
        })}`)
        return
      }

      if (fullQuestionResponse.status !== 200) {
        console.error(`Error: getNextQuestion: error in server response: ${JSON.stringify({ 
          chosenDrinkNames: this.chosenDrinkNames, 
          unchosenDrinkNames: this.unchosenDrinkNames,
          questionResponse
        })}`)
        return
      }

      console.log(`getNextQuestion: got new questions: ${JSON.stringify({ 
        chosenDrinkNames: this.chosenDrinkNames, 
        unchosenDrinkNames: this.unchosenDrinkNames,
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
      return _.chain(choice.reciepe)
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

<style scoped>

.heading {
  font-size: larger;
  font-weight: 600;
  margin-bottom: 15px;
  text-align: left;
}
.subheading {
  font-size: medium;
  margin-bottom: 10px;
}
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

.question-block-placeholder {
  height: 195px;
}

</style>
