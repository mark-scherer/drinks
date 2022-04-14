/*
  Question base and child classes.

  Should be one child question class per question type.
  Putting question types into their own children classes allows both abstracted interaction and readable definitions.
*/

const _ = require('lodash')


/*
  base universal interface questions of all types
*/
class Question {
  /*
    Note: see immediately below class definition for static props
    Node <= v11 doesn't allow static prop declaration inside the class lol
  */

  /*
    Factory function for creating child question instances.
    Probably should always use this and not actual ctors because this handles figuring out dynamic child class typing well.

    Given a json array of serialized question data, parse into question objects.
  */
  static parseQuestions(questionDataList) {
    return _.map(questionDataList, (questionData, i) => {
      try {
        // dynamically assign question child class according to type
        if (!questionData.type) throw Error(`missing questionData.type field`)
        if (!Question.QUESTION_CLASSES[questionData.type]) throw Error(`unsupported questionData.type: ${questionData.type}`)
        
        return new Question.QUESTION_CLASSES[questionData.type](questionData, true)
      } catch (parseError) {
        throw Error(`error parsing question #${i}: ${JSON.stringify({
          parseError: parseError.toString(),
          questionData
        })}`)
      }
    })
  }

  /*
    Given a list of parsed Questions, return their summaries.
  */
  static summarizeQuestions(questions) {
    return _.map(questions, (question, index) => {
      return {
        index,
        ...question.summary()
      }
    })
  }

  /*
    Constructor for use when creating new questions or deserializing exisitng question data.

    Inputs:
      data          : all question input params
      deserialized  : true if question created from result of previous Question.serialize(), otherwise a completely new question instance
  */
  constructor(data={}, deserialized=false) {
    
    // validate input data
    const requiredFields = this._getRequiredFields(deserialized ? 'answered' : 'input')
    const validationError = this._validateData(data, requiredFields)
    if (validationError) throw Error(`${this.constructor.name} constructor: cannot ${deserialized ? 'deserialize' : 'create'} object: ${validationError}`)

    // setup initial question state
    _.forEach(data, (value, field) => this[field] = value)
    this._bodyGenerated = false
  }

  /*
    Helper function to validate data meets specifications of validationObject.
    Returns null if meets spec, or returns error.

    Currently, validationObject is just a list of fields.
    Generic to support expansion to more complex validationObjects.
  */
  _validateData(data, validationObject) {
    let validationErrors = []

    _.forEach(validationObject, field => {
      if (data[field] === null || data[field] === undefined) validationErrors.push(`missing required field: ${field}`)
    })

    return validationErrors.length ? 
      JSON.stringify(validationErrors) :
      null
  }

  /*
    Helper method for retrieving required question input.
    Accounts for new question instance or deserializtion of previous question.
    Combines required params from base and child classes.

    Inputs:
      questionStage  : 
        input     : returns fields required to create question
        output    : returns fields required to output unanswered question
        answered  : returns fields required to serialized previously answered question
  */
  _getRequiredFields(questionStage) {
    const childClassName = this.constructor.name
    const childClass = Question.QUESTION_CLASSES[childClassName]
    
    let baseParams, childParams
    if (questionStage === 'answered') {
      baseParams = [].concat([
        Question.BASE_REQUIRED_INPUT_DATA,
        Question.BASE_REQUIRED_OUTPUT_DATA,
        Question.BASED_REQUIRED_ANSWERED_DATA
      ])
      childParams = [].concat([
        childClass.REQUIRED_INPUT_DATA,
        childClass.REQUIRED_OUTPUT_DATA,
        childClass.BASED_REQUIRED_ANSWERED_DATA
      ])
    } else if (questionStage === 'output') {
      baseParams = [].concat([
        Question.BASE_REQUIRED_INPUT_DATA,
        Question.BASE_REQUIRED_OUTPUT_DATA
      ])
      childParams = [].concat([
        childClass.REQUIRED_INPUT_DATA,
        childClass.REQUIRED_OUTPUT_DATA
      ])
    } else if (questionStage === 'input') {
      baseParams = Question.BASE_REQUIRED_INPUT_DATA
      childParams = childClass.REQUIRED_INPUT_DATA
    } else throw Error(`_getRequiredFields(): unsupported value for questionStage: ${questionStage}`)

    if (childParams === null || childParams === undefined) 
      throw Error(`required outputs for ${questionStage} questions missing for ${childClassName}, must implement!`)

    return _.flattenDeep(baseParams.concat(childParams))
  }

  /*
    Return all question data as object.
    For returning question data thru api.
  */
  serialize() {
    
    // fields to omit from serialization
    const INTERNAL_FIELDS = [
      '_bodyGenerated',

    ]

    if (!this._bodyGenerated) throw Error(`cannot serialize question without body!`)

    const requiredOutputData = this._getRequiredFields('output')
    const validationError = this._validateData(this, requiredOutputData)
    if (validationError) throw Error(`${this.constructor.name}.serialize: cannot serialize: ${JSON.stringify({ validationError, requiredOutputData })}`)

    return {
      type: this.constructor.name,
      ..._.omit(this, INTERNAL_FIELDS),
      // prevQuestions: _.map(this.prevQuestions, pq => pq.summary())
    }
  }

  /*
    Brief summary of question for debug logs.
  */
  summary() {
    return {
      type: this.type,
      choices: _.map(this.choices, 'choiceText'),
      selectedIndex: this.selectedIndex
    }
  }

  /*
    Abstract method for generating question body, must be overriden by child classes.

    Inputs:
      eligibleDrinksMap: map of drinkName: drinkInfo for all drinks to include in question making
      scoringConfig: scoring object to use to generate quesiton body

    Returns: diagnostic object detailing how question was generated
  */
  generateBody(eligibleDrinksMap, scoringConfig) {
    throw Error(`${this.constructor.name}.generateBody() not implemented! Must override Question.generateBody()`)
  }
}

/*
  Question static props
*/

/*
  List of all supported child question class definitions.
  This enables 1) picking a question type at random and 2) validating input question types
  Note: this is filled in after child class definition below, but left here for readability
*/
Question.QUESTION_CLASSES = null 
Question.BASE_REQUIRED_INPUT_DATA = [
  'prevQuestions'
]
Question.BASE_REQUIRED_OUTPUT_DATA = [
  'questionText',
  'choices'
]
Question.BASED_REQUIRED_ANSWERED_DATA = [
  'selectedIndex'
]


/*
  Question involving asking the user their preference between a set of ingredient groups.
*/
class IngredientGroupQuestion extends Question {
  
  /*
    Score a possible drink choice based on only it's intrensic properties.
    Note this should be cached and should not be recalculated, but values will change run to run

    Inputs:
      drink           : drink object to score
      scoringConfig   : scoring object

    Returns: 
      intrensicScore            : 0-1 intrensic score, 1 being the best match
      intrensicScoreDiagnostic  : diagnostic object for intrensic drink score
  */
  static _scoreDrinkIntrensically(drink, scoringConfig) {
    const factors = {}
    
    // use drink's source ratings
    factors.drinkRating = _.clamp((drink.source_avg_rating - scoringConfig.drinkRatingRangeMin) / (scoringConfig.drinkRatingRangeMax - scoringConfig.drinkRatingRangeMin), 0, 1)
    factors.drinkRatingCount = _.clamp(Math.log(drink.source_rating_count) / Math.log(scoringConfig.drinkRatingCountRangeMax), 0, 1)

    // weigh by category & glass
    const minCategoryHierarchy = Math.min(...Object.values(scoringConfig.drinkCategoryHierarchy))
    const maxCategoryHierarchy = Math.max(...Object.values(scoringConfig.drinkCategoryHierarchy))
    factors.drinkCategory = scoringConfig.drinkCategoryHierarchy[drink.category] ?
      (scoringConfig.drinkCategoryHierarchy[drink.category] - minCategoryHierarchy) / (maxCategoryHierarchy - minCategoryHierarchy) :
      0.5 // if category's heirarchy not specified, use mean

    const minGlassHierarchy = Math.min(...Object.values(scoringConfig.glassHierarchy))
    const maxGlassHierarchy = Math.max(...Object.values(scoringConfig.glassHierarchy))
    factors.glass = scoringConfig.glassHierarchy[drink.glass] ?
      (scoringConfig.glassHierarchy[drink.glass] - minGlassHierarchy) / (maxGlassHierarchy - minGlassHierarchy) :
      0.5 // if category's heirarchy not specified, used mean

    // give extra points to drinks having certain metadata
    factors.hasComments = drink.comments ? 1 : 0
    factors.hasGlass = drink.glass ? 1 : 0

    // calculated weighted average of factors
    const weightSum = _.sum(Object.values(scoringConfig.intrensicWeights))
    const intrensicScore = _.sumBy(Object.keys(factors), factorKey => {
      const factor = factors[factorKey]
      const weight = scoringConfig.intrensicWeights[factorKey] ?
        scoringConfig.intrensicWeights[factorKey] / weightSum :
        0
      return factor * weight
    })

    return { 
      intrensicScore,
      intrensicScoreDiagnostic: {
        intrensicScore,
        factors,
        ..._.pick(drink, [
          'source_avg_rating', 
          'source_rating_count',
          'category',
          'glass'
        ])
      }
    }
  }

  /*
    Score a possible drink choice.

    Inputs:
      drink           : drink object to score
      scoringConfig   : scoring object
      otherDrinks     : list of [{otherDrinkInfo, similarityCoef}] to apply to drink object to score

    Returns: 
      score             : 0-1 score, 1 being the best match
      scoreDiagnostic   : diagnostic object for drink score
  */
  _scorePossibleDrink(drink, scoringConfig, otherDrinks) {
    
    // start with intrinsic drink characteristics
    const { 
      intrensicScore, 
      intrensicScoreDiagnostic 
    } = IngredientGroupQuestion._scoreDrinkIntrensically(drink, scoringConfig)
    const score = intrensicScore
    
    return { 
      score,
      scoreDiagnostic: {
        score,
        intrensicScoreDiagnostic
      }
    }
  }

  /*
    Generate body of the IngredientGroupQuestion.

    Inputs:
      eligibleDrinksMap: map of drinkName: drinkInfo for all drinks to include in question making
      scoringConfig: scoring object to use to generate quesiton body

    Returns: diagnostic object detailing how question was generated
  */
  generateBody(eligibleDrinksMap, scoringConfig) {
    const QUESTION_TEXTS = [
      'Whichs your favorite?',
      'Pick your favorite',
      'Which looks best?',
      'Which of these sound best?'
    ]
    
    // filter drinks based of previous answers
      // fill this in later
    const possibleDrinksMap = _.cloneDeep(eligibleDrinksMap)

    // score all possible drinks
    const possibleDrinkScores = {},  possibleDrinkScoreDiagnostics = {}
    _.forEach(possibleDrinksMap, (possibleDrink, possibleDrinkName) => {
      const {
        score,
        scoreDiagnostic
      } = this._scorePossibleDrink(possibleDrink, scoringConfig)
      possibleDrinkScores[possibleDrinkName] = score
      possibleDrinkScoreDiagnostics[possibleDrinkName] = scoreDiagnostic
    })

    // chose drinks to be question choices
    const drinkChoiceNames = _.sortBy(Object.keys(possibleDrinkScores), possibleDrinkName => -1*possibleDrinkScores[possibleDrinkName]).slice(0, 3)

    this.choices = _.map(drinkChoiceNames, drinkName => {
      return {
        choiceText: drinkName
      }
    })

    this.questionText = _.sample(QUESTION_TEXTS)    
    this._bodyGenerated = true

    // should include all summary information about how body was generated
    return {
      possibleDrinkScoreDiagnostics,
    }
  }
}
IngredientGroupQuestion.REQUIRED_INPUT_DATA = []
IngredientGroupQuestion.REQUIRED_OUTPUT_DATA = []

/*
  This is unique, but necesary to explicitly list child classes here.

  In order to dynamically create children class instances within base, need a dict of all the child class definitions.
  But child classes have static properties, and JS doesn't like you declare those inside a class defintion - so need to reference the class outside of the definition.

  Just add all question child classes defined immeidately above here.
*/
const _questionClasses = [
  IngredientGroupQuestion
]

// finally convert list of question subclasses into map keyed by class name
Question.QUESTION_CLASSES = _.fromPairs(_.map(_questionClasses, questionClass => [questionClass.name, questionClass]))

/*
  Only expliclity export Question class.
  To generate child questions either use Question.parseQuestions() factory function of Question.QUESTION_CLASSES map.
*/
module.exports = {
  Question
}