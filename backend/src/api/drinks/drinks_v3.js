/*
  get next question to help narrow down drink choices
*/

const Bluebird = require('bluebird')
const _ = require('lodash')
const backendUtils = require('../../../utils/utils')
const drinkUtils = require('./utils')
const { Question } = require('./Question.js')



/*** getQuestion & helpers ***/

/*
  Pick next question type.
*/
const _pickQuestionType = function(prevQuestions) {
  // TODO: eventually will support allowQuestionTypes & disallowedQuestionTypes within a algo config
    // these will support different values by question index
    // for now: any question type at any index

  return _.sample(Object.keys(Question.QUESTION_CLASSES))
}


/*
  Return next question object
  
  inputs
    allDrinksMap        : map of drink names, fully formatted drink object for all drinks (see backend_utils.allDrinks()) (we cache this within calling router)
    scoringConfig       : scoring config as object
    prevQuestionData    : json array of previously answered serialized questions objects, in order
*/
const getQuestion = async function (
  allDrinksMap,
  scoringConfig,
  prevQuestionData
) {

  prevQuestions = Question.parseQuestions(prevQuestionData)
  console.log(`getQuestion: generating next question: ${JSON.stringify({
    prevQuestions: Question.summarizeQuestions(prevQuestions),
    // scoringConfig
  })}`)

  const nextQuestionType = _pickQuestionType(prevQuestions)
  const nextQuestion = new Question.QUESTION_CLASSES[nextQuestionType]({ prevQuestions })
  const questionDiagnostic = nextQuestion.generateBody(allDrinksMap, scoringConfig)
  
  return { ...nextQuestion.serialize() }
}



/*** getDrinks & helpers ***/

const getDrinks = async function () {}

module.exports = {
  getQuestion,
  getDrinks
}